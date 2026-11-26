from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from services.keyword_research import research

router = APIRouter(tags=["Research"])


class KeywordRequest(BaseModel):
    seed: str
    sources: List[str] = ["google", "amazon", "ebay", "etsy"]
    mode: str = "quick"


@router.post("/keywords")
async def keywords(data: KeywordRequest):
    if data.mode not in ("quick", "deep"):
        raise HTTPException(status_code=400, detail="Mode quick ya deep ho")
    try:
        # Network ka kaam alag thread mein, taake baaqi server na ruke
        result = await run_in_threadpool(research, data.seed, data.sources, data.mode == "deep")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research error: {e}")

    if all(s["status"] == "failed" for s in result["sources"].values()):
        raise HTTPException(
            status_code=502,
            detail="Koi bhi source jawab nahi de saka (internet ya site ne rok diya). Thori der baad try karo.",
        )
    return result