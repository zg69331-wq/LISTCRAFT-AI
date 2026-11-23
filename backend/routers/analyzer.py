from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from services.listing_analyzer import RULES, analyze_listing
from services.listing_fetcher import FetchError, fetch_listing

router = APIRouter(tags=["Analyzer"])


class AnalyzeRequest(BaseModel):
    marketplace: str = "etsy"
    title: str = ""
    description: str = ""
    tags: List[str] = []
    keywords: List[str] = []


class FetchRequest(BaseModel):
    marketplace: str = "etsy"
    url: str


@router.post("/analyze-listing")
def analyze(data: AnalyzeRequest):
    if data.marketplace not in RULES:
        raise HTTPException(status_code=400, detail="Marketplace galat hai")
    return analyze_listing(
        data.marketplace, data.title, data.description, data.tags, data.keywords
    )


@router.post("/fetch-listing")
async def fetch(data: FetchRequest):
    if data.marketplace not in RULES:
        raise HTTPException(status_code=400, detail="Marketplace galat hai")
    try:
        # Network ka kaam alag thread mein, taake baaqi server na ruke
        return await run_in_threadpool(fetch_listing, data.marketplace, data.url)
    except FetchError as e:
        raise HTTPException(status_code=422, detail=str(e))