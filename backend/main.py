from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import auth, listings, images, vector, analyzer, mockups, scraper, keywords, videos
from security import get_current_user

# Tables database mein bana do (agar nahi hain)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ListCraft AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Login aur signup sab ke liye khule hain
app.include_router(auth.router)

# Baaqi sab tools ke liye login zaroori hai
protected = [Depends(get_current_user)]
app.include_router(listings.router, dependencies=protected)
app.include_router(images.router, dependencies=protected)
app.include_router(vector.router, dependencies=protected)
app.include_router(analyzer.router, dependencies=protected)
app.include_router(mockups.router, dependencies=protected)
app.include_router(scraper.router, dependencies=protected)
app.include_router(keywords.router, dependencies=protected)
app.include_router(videos.router, dependencies=protected)


@app.get("/health")
def health():
    return {"message": "Backend chal raha hai!"}