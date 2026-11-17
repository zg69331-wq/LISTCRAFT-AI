from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from sqlalchemy.orm import Session

import models
import schemas
from config import SECRET_KEY, ALGORITHM, TOKEN_EXPIRE_MINUTES
from database import get_db

router = APIRouter(tags=["Auth"])


def hash_password(password: str) -> str:
    # password ka secret code banao
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    # check karo password asli code se match karta hai
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/signup", response_model=schemas.UserOut)
def signup(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Ye email pehle se registered hai")
    user = models.User(email=data.email, hashed_password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(data: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ya password galat hai")
    return {"access_token": create_token(user.email), "token_type": "bearer"}