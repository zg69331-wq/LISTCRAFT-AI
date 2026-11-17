import io
import zipfile

from PIL import Image, ImageColor, ImageOps

# Har platform ka size. Badalna ho to sirf yahan badlo.
PRESETS = {
    "etsy":        {"w": 2000, "h": 2000, "bg": None},
    "amazon":      {"w": 2000, "h": 2000, "bg": "white"},
    "ebay":        {"w": 1600, "h": 1600, "bg": None},
    "shopify":     {"w": 2048, "h": 2048, "bg": None},
    "woocommerce": {"w": 800,  "h": 800,  "bg": None},
}

FORMATS = {"jpg": "JPEG", "png": "PNG", "webp": "WEBP"}


def resize_image(
    image_bytes: bytes,
    width: int,
    height: int,
    fit: str = "pad",
    bg_color: str = "white",
    fmt: str = "jpg",
    quality: int = 90,
) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)  # mobile photo ghoom jaye to seedhi karo
    img = img.convert("RGBA")

    if fit == "crop":
        # poora canvas bharo, extra hissa kaat do
        result = ImageOps.fit(img, (width, height), Image.LANCZOS)
    else:
        # poori photo dikhao, bacha hua hissa background rang se bharo
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


def process_batch(files, platforms, custom_size, fit, bg_color, fmt, quality) -> bytes:
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
            for label, w, h, bg in targets:
                out = resize_image(data, w, h, fit, bg, fmt, quality)
                zf.writestr(f"{label}/{base}-{label}.{fmt}", out)
    return zip_buffer.getvalue()
