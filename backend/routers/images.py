from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from services.image_processor import FORMATS, PRESETS, process_batch

router = APIRouter(tags=["Images"])

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILES = 20
MAX_MB = 8


@router.get("/presets")
def presets():
    return PRESETS


@router.post("/resize")
async def resize(
    images: List[UploadFile] = File(...),
    platforms: str = Form("etsy"),          # jaise: "etsy,amazon"
    custom_width: int = Form(0),
    custom_height: int = Form(0),
    fit: str = Form("pad"),
    bg_color: str = Form("white"),
    fmt: str = Form("jpg"),
    quality: int = Form(90),
):
    if len(images) > MAX_FILES:
        raise HTTPException(400, f"Ek baar mein {MAX_FILES} se zyada photos nahi")
    if fmt not in FORMATS:
        raise HTTPException(400, "Format jpg, png ya webp hona chahiye")
    if fit not in ("pad", "crop"):
        raise HTTPException(400, "fit pad ya crop hona chahiye")

    plat_list = [p.strip() for p in platforms.split(",") if p.strip()]
    for p in plat_list:
        if p not in PRESETS:
            raise HTTPException(400, f"Platform nahi mila: {p}")

    custom = (custom_width, custom_height) if custom_width > 0 and custom_height > 0 else None
    if not plat_list and not custom:
        raise HTTPException(400, "Kam az kam ek platform ya custom size chuno")

    files = []
    for f in images:
        if f.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, f"{f.filename}: sirf JPG, PNG ya WebP")
        data = await f.read()
        if len(data) > MAX_MB * 1024 * 1024:
            raise HTTPException(400, f"{f.filename}: {MAX_MB} MB se choti honi chahiye")
        files.append((f.filename, data))

    try:
        zip_bytes = process_batch(files, plat_list, custom, fit, bg_color, fmt, quality)
    except Exception as e:
        raise HTTPException(500, f"Resize error: {e}")

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=resized-images.zip"},
    )
