from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

import models
from config import ALGORITHM, SECRET_KEY
from database import get_db

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> models.User:
    """Token check karta hai. Galat ya gayab ho to 401 deta hai."""
    error = HTTPException(
        status_code=401,
        detail="Pehle login karo",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise error

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except JWTError:
        raise error

    if not email:
        raise error

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise error
    return user