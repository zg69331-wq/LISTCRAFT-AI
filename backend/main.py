from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import auth, listings, images
# Tables database mein bana do (agar nahi hain)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ListCraft AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(images.router)


@app.get("/health")
def health():
    return {"message": "Backend chal raha hai!"}