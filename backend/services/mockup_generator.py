import io

from PIL import Image, ImageDraw, ImageFilter, ImageOps

SIZE = 1600

SCENES = {
    "frame": "Framed print",
    "poster": "Poster with tape",
    "studio": "Studio shot",
}

FRAME_COLORS = {
    "black": (30, 30, 32),
    "white": (246, 246, 244),
    "wood": (158, 114, 74),
}


def _hex_to_rgb(value: str, default: tuple) -> tuple:
    value = (value or "").strip().lstrip("#")
    if len(value) == 6:
        try:
            return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))
        except ValueError:
            pass
    return default


def _shade(rgb: tuple, factor: float) -> tuple:
    return tuple(max(0, min(255, int(c * factor))) for c in rgb)


def _gradient_bg(top: tuple, bottom: tuple) -> Image.Image:
    """Upar se neeche halka sa rang badalta background."""
    mask = Image.linear_gradient("L").resize((SIZE, SIZE))
    return Image.composite(
        Image.new("RGB", (SIZE, SIZE), bottom),
        Image.new("RGB", (SIZE, SIZE), top),
        mask,
    ).convert("RGBA")


def _paste_with_shadow(canvas: Image.Image, layer: Image.Image, pos: tuple,
                       offset=(14, 24), blur=28, opacity=105):
    """Layer ke peeche naram saaya banata hai (layer ke alpha ke mutabiq)."""
    mask = Image.new("L", canvas.size, 0)
    mask.paste(layer.getchannel("A"), (pos[0] + offset[0], pos[1] + offset[1]))
    mask = mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda p: p * opacity // 255)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 255))
    shadow.putalpha(mask)
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(layer, pos)


def _load(image_bytes: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img).convert("RGBA")
    img.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
    return img


def _fit(img: Image.Image, box: tuple) -> Image.Image:
    return ImageOps.contain(img, box, method=Image.Resampling.LANCZOS)


def _on_white(img: Image.Image) -> Image.Image:
    """Transparent photo ko safed par rakho (frame ke andar)."""
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    bg.alpha_composite(img)
    return bg


# ---------- Scenes ----------

def _scene_frame(art: Image.Image, wall: tuple, frame_rgb: tuple) -> Image.Image:
    canvas = _gradient_bg(_shade(wall, 1.06), _shade(wall, 0.9))
    art = _on_white(_fit(art, (820, 980)))
    mat, thick = 64, 38
    ow = art.width + 2 * (mat + thick)
    oh = art.height + 2 * (mat + thick)

    layer = Image.new("RGBA", (ow, oh), frame_rgb + (255,))
    d = ImageDraw.Draw(layer)
    # frame ki kinaaron par halki roshni aur parchhai
    d.rectangle([0, 0, ow - 1, oh - 1], outline=_shade(frame_rgb, 1.18), width=3)
    d.rectangle([thick - 3, thick - 3, ow - thick + 2, oh - thick + 2], outline=_shade(frame_rgb, 0.7), width=3)
    # mat
    d.rectangle([thick, thick, ow - thick - 1, oh - thick - 1], fill=(244, 242, 236, 255))
    # art ke gird andar ka saaya
    ax, ay = thick + mat, thick + mat
    d.rectangle([ax - 2, ay - 2, ax + art.width + 1, ay + art.height + 1], outline=(205, 202, 194, 255), width=2)
    layer.alpha_composite(art, (ax, ay))

    pos = ((SIZE - ow) // 2, int(SIZE * 0.47 - oh / 2))
    _paste_with_shadow(canvas, layer, pos, offset=(16, 26), blur=30, opacity=120)
    return canvas


def _scene_poster(art: Image.Image, wall: tuple) -> Image.Image:
    canvas = _gradient_bg(_shade(wall, 1.06), _shade(wall, 0.9))
    art = _on_white(_fit(art, (880, 1040)))
    border = 26
    ow, oh = art.width + 2 * border, art.height + 2 * border
    layer = Image.new("RGBA", (ow, oh), (252, 252, 250, 255))
    layer.alpha_composite(art, (border, border))

    pos = ((SIZE - ow) // 2, int(SIZE * 0.47 - oh / 2))
    _paste_with_shadow(canvas, layer, pos, offset=(10, 18), blur=20, opacity=95)

    # upar ke kono par tape
    for cx, angle in ((pos[0] + 30, -38), (pos[0] + ow - 30, 38)):
        tape = Image.new("RGBA", (150, 46), (222, 208, 170, 210))
        tape = tape.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
        canvas.alpha_composite(tape, (cx - tape.width // 2, pos[1] - tape.height // 2 + 14))
    return canvas


def _scene_studio(art: Image.Image, bg: tuple) -> Image.Image:
    canvas = _gradient_bg(_shade(bg, 1.1), _shade(bg, 0.86))
    art = _fit(art, (1040, 1040))
    # opaque photo ke kone halke gol karo
    if art.getextrema()[3][0] == 255:
        mask = Image.new("L", art.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, art.width - 1, art.height - 1], radius=28, fill=255)
        art.putalpha(mask)
    pos = ((SIZE - art.width) // 2, (SIZE - art.height) // 2 - 20)
    _paste_with_shadow(canvas, art, pos, offset=(0, 34), blur=38, opacity=110)
    return canvas


# ---------- Main ----------

def make_mockup(image_bytes: bytes, scene: str, wall_color: str = "#e9e4dc",
                frame_color: str = "black") -> bytes:
    art = _load(image_bytes)
    wall = _hex_to_rgb(wall_color, (233, 228, 220))
    frame_rgb = FRAME_COLORS.get(frame_color, FRAME_COLORS["black"])

    if scene == "frame":
        out = _scene_frame(art, wall, frame_rgb)
    elif scene == "poster":
        out = _scene_poster(art, wall)
    elif scene == "studio":
        out = _scene_studio(art, wall)
    else:
        raise ValueError("Scene galat hai")

    buf = io.BytesIO()
    out.convert("RGB").save(buf, format="JPEG", quality=92)
    return buf.getvalue()