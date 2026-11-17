from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Database ek file hai: listcraft.db (backend folder mein khud ban jayegi)
DATABASE_URL = "sqlite:///./listcraft.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()

# Har request ko database connection dena, kaam ke baad band karna
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        