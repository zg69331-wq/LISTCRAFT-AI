import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import get_db
from security import get_current_user
from services.listing_fetcher import FetchError
from services.store_scraper import MAX_PRODUCTS_LIMIT, scrape_store
from services.store_summary import summarize

router = APIRouter(tags=["Scraper"])

MAX_SAVED_PER_USER = 50


class ScrapeRequest(BaseModel):
    url: str
    max_products: int = MAX_PRODUCTS_LIMIT


class SaveRequest(BaseModel):
    store: dict
    platform: str
    products: List[dict]
    summary: dict


@router.post("/scrape")
async def scrape(data: ScrapeRequest):
    try:
        # Network ka kaam alag thread mein, taake baaqi server na ruke
        result = await run_in_threadpool(scrape_store, data.url, data.max_products)
    except FetchError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scrape error: {e}")

    result["summary"] = summarize(result["products"], result["store"], result["platform"])
    return result


@router.post("/scrapes")
def save_scrape(
    data: SaveRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not data.products:
        raise HTTPException(status_code=400, detail="Save karne ke liye koi product nahi")
    if len(data.products) > MAX_PRODUCTS_LIMIT:
        raise HTTPException(status_code=400, detail="Bohat zyada products")

    count = db.query(models.SavedScrape).filter(models.SavedScrape.user_id == user.id).count()
    if count >= MAX_SAVED_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"Sirf {MAX_SAVED_PER_USER} scrapes save ho sakte hain. Kuch purane delete karo.",
        )

    row = models.SavedScrape(
        user_id=user.id,
        store_name=str(data.store.get("name", ""))[:200],
        store_url=str(data.store.get("url", ""))[:500],
        platform=data.platform[:50],
        product_count=len(data.products),
        data=json.dumps({"store": data.store, "products": data.products, "summary": data.summary}),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.get("/scrapes")
def list_scrapes(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.SavedScrape)
        .filter(models.SavedScrape.user_id == user.id)
        .order_by(models.SavedScrape.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "store_name": r.store_name,
            "store_url": r.store_url,
            "platform": r.platform,
            "product_count": r.product_count,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in rows
    ]


def _own_row(db: Session, user: models.User, scrape_id: int) -> models.SavedScrape:
    row = (
        db.query(models.SavedScrape)
        .filter(models.SavedScrape.id == scrape_id, models.SavedScrape.user_id == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Yeh scrape nahi mila")
    return row


@router.get("/scrapes/{scrape_id}")
def get_scrape(
    scrape_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    row = _own_row(db, user, scrape_id)
    payload = json.loads(row.data)
    return {"id": row.id, "platform": row.platform, **payload}


@router.delete("/scrapes/{scrape_id}")
def delete_scrape(
    scrape_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    row = _own_row(db, user, scrape_id)
    db.delete(row)
    db.commit()
    return {"deleted": True}