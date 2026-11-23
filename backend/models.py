from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)


class SavedScrape(Base):
    __tablename__ = "saved_scrapes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    store_name = Column(String, nullable=False)
    store_url = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    product_count = Column(Integer, default=0)
    data = Column(Text, nullable=False)  # JSON: store, products, summary
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))