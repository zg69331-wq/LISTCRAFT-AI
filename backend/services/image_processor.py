import io
import zipfile

import requests
from PIL import Image, ImageColor, ImageOps

from config import REMOVEBG_API_KEY

# Har platform ka size. Badalna ho to sirf yahan badlo.
PRESETS = {
    "etsy":        {"w": 2000, "h": 2000, "bg": None},
    "amazon":      {"w": 2000, "h": 2000, "bg": "white"},
    "ebay":        {"w": 1600, "h": 1600, "bg": None},
    "shopify":     {"w": 2048, "h": 2048, "bg": None},
    "woocommerce": {"w": 800,  "h": 800,  "bg": None},
}

FORMATS = {"jpg": "JPEG", "png": "PNG", "webp": "WEBP"}


def remove_background(image_bytes: bytes) -> Image.Image:
    """Remove.bg API ko photo bhejta hai, transparent background wali image wapas leta hai."""
    if not REMOVEBG_API_KEY:
        raise RuntimeError("REMOVEBG_API_KEY .env mein nahi mili")

    response = requests.post(
        "https://api.remove.bg/v1.0/removebg",
        files={"image_file": image_bytes},
        data={"size": "auto"},
        headers={"X-Api-Key": REMOVEBG_API_KEY},
        timeout=60,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Remove.bg error {response.status_code}: {response.text[:200]}")
    return Image.open(io.BytesIO(response.content)).convert("RGBA")


def resize_image(
    image_bytes: bytes,
    width: int,
    height: int,
    fit: str = "pad",
    bg_color: str = "white",
    fmt: str = "jpg",
    quality: int = 90,
    remove_bg: bool = False,
    cutout: Image.Image | None = None,
) -> bytes:
    if cutout is not None:
        img = cutout.copy()
    else:
        img = Image.open(io.BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)  # mobile photo ghoom jaye to seedhi karo
        if remove_bg:
            img = remove_background(image_bytes)
    img = img.convert("RGBA")

    if fit == "crop":
        fitted = ImageOps.fit(img, (width, height), Image.LANCZOS)
        result = Image.new("RGBA", (width, height), ImageColor.getrgb(bg_color) + (255,))
        result.paste(fitted, (0, 0), fitted)
    else:
        img.thumbnail((width, height), Image.LANCZOS)
        result = Image.new("RGBA", (width, height), ImageColor.getrgb(bg_color) + (255,))
        x = (width - img.width) // 2
        y = (height - img.height) // 2
        result.paste(img, (x, y), img)

    out = io.BytesIO()
    pil_format = FORMATS[fmt]
    if pil_format == "PNG":
        result.save(out, format="PNG")
    else:
        result.convert("RGB").save(out, format=pil_format, quality=quality)
    return out.getvalue()


def process_batch(files, platforms, custom_size, fit, bg_color, fmt, quality, remove_bg=False) -> bytes:
    """files: [(naam, bytes)]. Har photo ke liye har platform ki image banakar ZIP deta hai."""
    targets = []
    for p in platforms:
        preset = PRESETS[p]
        targets.append((p, preset["w"], preset["h"], preset["bg"] or bg_color))
    if custom_size:
        w, h = custom_size
        targets.append(("custom", w, h, bg_color))

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in files:
            base = name.rsplit(".", 1)[0]
            # Background sirf ek baar hatao (API ka quota bachane ke liye),
            # phir har platform ke liye wahi cutout use karo
            cutout = remove_background(data) if remove_bg else None
            for label, w, h, bg in targets:
                out = resize_image(data, w, h, fit, bg, fmt, quality, False, cutout)
                zf.writestr(f"{label}/{base}-{label}.{fmt}", out)
    return zip_buffer.getvalue()

