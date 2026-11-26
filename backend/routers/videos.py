from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from PIL import UnidentifiedImageError

from services.video_maker import MAX_IMAGES, MIN_IMAGES, make_video

router = APIRouter(tags=["Video"])

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_MB_EACH = 8
MAX_MB_TOTAL = 40


@router.post("/video")
async def video(
    images: List[UploadFile] = File(...),
    aspect: str = Form("square"),
    seconds: float = Form(3.0),
    transition: str = Form("fade"),
    motion: bool = Form(True),
    fit: str = Form("cover"),
    caption: str = Form(""),
):
    if not MIN_IMAGES <= len(images) <= MAX_IMAGES:
        raise HTTPException(400, f"{MIN_IMAGES} se {MAX_IMAGES} photos do")

    blobs, total = [], 0
    for f in images:
        if f.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, "Sirf JPG, PNG ya WebP photos do")
        data = await f.read()
        if len(data) > MAX_MB_EACH * 1024 * 1024:
            raise HTTPException(400, f"Har photo {MAX_MB_EACH} MB se choti honi chahiye")
        total += len(data)
        blobs.append(data)
    if total > MAX_MB_TOTAL * 1024 * 1024:
        raise HTTPException(400, f"Sab photos mila kar {MAX_MB_TOTAL} MB se kam hon")

    try:
        # Video banana bhaari kaam hai, isliye alag thread mein
        out = await run_in_threadpool(
            make_video, blobs, aspect, seconds, transition, motion, fit, caption
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except UnidentifiedImageError:
        raise HTTPException(400, "Koi photo khul nahi saki, dusri try karo")
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    except Exception as e:
        raise HTTPException(500, f"Video error: {e}")

    return Response(content=out, media_type="video/mp4")