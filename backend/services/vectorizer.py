import io
import os
import tempfile

import vtracer
from PIL import Image, ImageOps


def to_svg(image_bytes: bytes, colors: int = 8, detail: str = "medium") -> bytes:
    """Raster photo ko SVG vector mein badalta hai.
    colors: 2-16 (kam rang = saaf, simple vector)
    detail: low / medium / high
    """
    # Detail level ke hisaab se tracing settings
    presets = {
        "low":    {"filter_speckle": 8, "corner_threshold": 90, "length_threshold": 8.0},
        "medium": {"filter_speckle": 4, "corner_threshold": 60, "length_threshold": 4.0},
        "high":   {"filter_speckle": 2, "corner_threshold": 45, "length_threshold": 2.0},
    }
    p = presets[detail]

    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)
    img.thumbnail((1500, 1500))  # bohat bari photo slow hoti hai

    # Rang kam karo (colour count), taake vector saaf bane
    img = img.convert("RGB").quantize(colors=colors).convert("RGB")

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "in.png")
        dst = os.path.join(tmp, "out.svg")
        img.save(src)
        vtracer.convert_image_to_svg_py(
            src,
            dst,
            colormode="color",
            filter_speckle=p["filter_speckle"],
            corner_threshold=p["corner_threshold"],
            length_threshold=p["length_threshold"],
            color_precision=6,
        )
        with open(dst, "rb") as f:
            return f.read()

        