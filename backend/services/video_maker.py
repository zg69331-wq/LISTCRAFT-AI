import io
import os
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ASPECTS = {
    "square": (1080, 1080),     # Etsy, Instagram post
    "vertical": (1080, 1920),   # Reels, TikTok, Shorts
    "landscape": (1280, 720),   # YouTube, website
}
TRANSITIONS = {"fade", "slide", "none"}
FITS = {"cover", "contain"}

FPS = 30
TRANSITION_SECONDS = 0.6
MIN_IMAGES, MAX_IMAGES = 1, 8
MIN_SECONDS, MAX_SECONDS = 1.5, 6.0
MAX_CAPTION = 60


def _ease(p: float) -> float:
    p = max(0.0, min(1.0, p))
    return p * p * (3 - 2 * p)


def _load(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img).convert("RGBA")
    img.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
    return img


def _on_white(img: Image.Image) -> Image.Image:
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    bg.alpha_composite(img)
    return bg.convert("RGB")


class _Clip:
    """Ek photo ka chhota sa video hissa (halki zoom ke saath)."""

    def __init__(self, img: Image.Image, size: tuple, fit: str, zoom_in: bool, motion: bool):
        self.W, self.H = size
        self.fit = fit
        self.zoom_in = zoom_in
        self.motion = motion
        flat = _on_white(img)

        if fit == "cover":
            scale = max(self.W / flat.width, self.H / flat.height)
            cw = max(self.W, round(flat.width * scale))
            ch = max(self.H, round(flat.height * scale))
            self.cover = flat.resize((cw, ch), Image.Resampling.LANCZOS)
            self.zoom_range = 0.12
        else:
            # peeche dhundla bara background, aage poori photo
            scale = max(self.W / flat.width, self.H / flat.height)
            bg = flat.resize((round(flat.width * scale), round(flat.height * scale)), Image.Resampling.BILINEAR)
            left = (bg.width - self.W) // 2
            top = (bg.height - self.H) // 2
            bg = bg.crop((left, top, left + self.W, top + self.H)).filter(ImageFilter.GaussianBlur(26))
            self.bg = Image.blend(bg, Image.new("RGB", bg.size, (0, 0, 0)), 0.25)
            fscale = min(self.W * 0.9 / img.width, self.H * 0.9 / img.height)
            self.fg = img.resize((max(1, round(img.width * fscale)), max(1, round(img.height * fscale))),
                                 Image.Resampling.LANCZOS)
            self.zoom_range = 0.06

    def _zoom(self, p: float) -> float:
        if not self.motion:
            return 1.0
        e = _ease(p)
        return 1 + self.zoom_range * (e if self.zoom_in else 1 - e)

    def render(self, p: float) -> Image.Image:
        z = self._zoom(p)
        if self.fit == "cover":
            cw, ch = self.cover.size
            ww, wh = self.W / z, self.H / z
            x0 = min(max((cw - ww) / 2, 0), cw - ww)
            y0 = min(max((ch - wh) / 2, 0), ch - wh)
            return self.cover.resize((self.W, self.H), Image.Resampling.BILINEAR,
                                     box=(x0, y0, x0 + ww, y0 + wh))
        fz = self.fg.resize((max(1, round(self.fg.width * z)), max(1, round(self.fg.height * z))),
                            Image.Resampling.BILINEAR)
        frame = self.bg.copy()
        frame.paste(fz, ((self.W - fz.width) // 2, (self.H - fz.height) // 2), fz)
        return frame


def _font(size: int):
    for name in ("arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size)


def _caption_layer(text: str, size: tuple) -> Image.Image:
    W, H = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    fsize = max(28, round(min(W, H) * 0.05))
    font = _font(fsize)
    while fsize > 20 and d.textlength(text, font=font) > W * 0.84:
        fsize -= 2
        font = _font(fsize)
    tw = d.textlength(text, font=font)
    pad_x, pad_y = round(fsize * 0.8), round(fsize * 0.5)
    bar_w, bar_h = round(tw + pad_x * 2), round(fsize + pad_y * 2)
    x0 = (W - bar_w) // 2
    y0 = H - bar_h - round(H * 0.07)
    d.rounded_rectangle([x0, y0, x0 + bar_w, y0 + bar_h], radius=round(bar_h / 2), fill=(0, 0, 0, 150))
    d.text((W / 2, y0 + bar_h / 2), text, font=font, fill=(255, 255, 255, 255), anchor="mm")
    return layer


def _ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        raise RuntimeError(
            "imageio-ffmpeg install nahi hai. Backend terminal mein chalao: "
            ".\\venv\\Scripts\\python -m pip install imageio-ffmpeg"
        )


def make_video(images: list[bytes], aspect: str = "square", seconds: float = 3.0,
               transition: str = "fade", motion: bool = True, fit: str = "cover",
               caption: str = "") -> bytes:
    n = len(images)
    if not MIN_IMAGES <= n <= MAX_IMAGES:
        raise ValueError(f"{MIN_IMAGES} se {MAX_IMAGES} photos do.")
    if aspect not in ASPECTS:
        raise ValueError("Video ka size galat hai.")
    if transition not in TRANSITIONS:
        raise ValueError("Transition galat hai.")
    if fit not in FITS:
        raise ValueError("Fit galat hai.")
    seconds = max(MIN_SECONDS, min(MAX_SECONDS, float(seconds)))
    caption = (caption or "").strip()[:MAX_CAPTION]

    size = ASPECTS[aspect]
    W, H = size
    tr = 0.0 if (transition == "none" or n == 1) else min(TRANSITION_SECONDS, seconds / 2)
    step = seconds - tr
    total = n * seconds - (n - 1) * tr
    frames = max(1, round(total * FPS))

    clips = [_Clip(_load(b), size, fit, i % 2 == 0, motion) for i, b in enumerate(images)]
    overlay = _caption_layer(caption, size) if caption else None

    exe = _ffmpeg_exe()
    with tempfile.TemporaryDirectory() as tmp:
        out_path = os.path.join(tmp, "video.mp4")
        cmd = [
            exe, "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
            "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "23",
            "-movflags", "+faststart", out_path,
        ]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            for f in range(frames):
                T = f / FPS
                i = min(int(T / step + 1e-9), n - 1)
                lt = T - i * step
                cur = clips[i].render(lt / seconds)

                if i > 0 and tr > 0 and lt < tr:
                    prev = clips[i - 1].render((lt + step) / seconds)
                    a = _ease(lt / tr)
                    if transition == "fade":
                        cur = Image.blend(prev, cur, a)
                    else:  # slide
                        canvas = Image.new("RGB", size)
                        canvas.paste(prev, (-round(a * W), 0))
                        canvas.paste(cur, (round((1 - a) * W), 0))
                        cur = canvas

                if overlay is not None:
                    cur = cur.copy()
                    cur.paste(overlay, (0, 0), overlay)
                proc.stdin.write(cur.tobytes())
            proc.stdin.close()
        except BrokenPipeError:
            pass
        err = proc.stderr.read().decode(errors="ignore")
        proc.wait()
        if proc.returncode != 0:
            raise RuntimeError("Video encode nahi ho saki: " + err[-300:])
        with open(out_path, "rb") as fh:
            return fh.read()