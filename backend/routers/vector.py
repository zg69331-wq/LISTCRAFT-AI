from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from services.vectorizer import to_svg

router = APIRouter(tags=["Vector"])

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]


@router.post("/vectorize")
async def vectorize(
    image: UploadFile = File(...),
    colors: int = Form(8),
    detail: str = Form("medium"),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Sirf JPG, PNG ya WebP photo do")
    if not 2 <= colors <= 16:
        raise HTTPException(400, "colors 2 se 16 ke beech hon")
    if detail not in ("low", "medium", "high"):
        raise HTTPException(400, "detail low, medium ya high ho")

    data = await image.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "Photo 8 MB se choti honi chahiye")

    try:
        svg = to_svg(data, colors, detail)
    except Exception as e:
        raise HTTPException(500, f"Vector error: {e}")

    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Content-Disposition": "attachment; filename=vector.svg"},
    )

