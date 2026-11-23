from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from PIL import UnidentifiedImageError

from services.mockup_generator import FRAME_COLORS, SCENES, make_mockup

router = APIRouter(tags=["Mockups"])

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_MB = 8


@router.post("/mockup")
async def mockup(
    image: UploadFile = File(...),
    scene: str = Form("frame"),
    wall_color: str = Form("#e9e4dc"),
    frame_color: str = Form("black"),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Sirf JPG, PNG ya WebP photo do")
    if scene not in SCENES:
        raise HTTPException(400, "Scene galat hai")
    if frame_color not in FRAME_COLORS:
        raise HTTPException(400, "Frame ka rang black, white ya wood ho")

    data = await image.read()
    if len(data) > MAX_MB * 1024 * 1024:
        raise HTTPException(400, f"Photo {MAX_MB} MB se choti honi chahiye")

    try:
        # Bhaari kaam alag thread mein, taake baaqi server na ruke
        out = await run_in_threadpool(make_mockup, data, scene, wall_color, frame_color)
    except UnidentifiedImageError:
        raise HTTPException(400, "Yeh photo khul nahi saki, dusri try karo")
    except Exception as e:
        raise HTTPException(500, f"Mockup error: {e}")

    return Response(content=out, media_type="image/jpeg")