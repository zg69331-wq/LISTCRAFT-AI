from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.listing_generator import RULES, generate_listing

router = APIRouter(tags=["Listings"])

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]


@router.post("/generate-listing")
async def generate(
    image: UploadFile = File(...),
    marketplace: str = Form("etsy"),
    keywords: str = Form(""),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Sirf JPG, PNG ya WebP photo do")
    if marketplace not in RULES:
        raise HTTPException(status_code=400, detail="Marketplace galat hai")

    image_bytes = await image.read()
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo 8 MB se choti honi chahiye")

    try:
        return generate_listing(image_bytes, image.content_type, marketplace, keywords)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {e}")