from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Wash(Base):
    __tablename__ = "washes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    address = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    logo_url = Column(String, nullable=True)
    rating = Column(Float, default=0.0)
    commission_percent = Column(Float, default=15.0)
    opening_time = Column(String, default="08:00")
    closing_time = Column(String, default="22:00")
    is_active = Column(Boolean, default=True)
    is_open_now = Column(Boolean, default=True)
    capacity = Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # --- Owner-onboarding flow ---
    # status lifecycle: pending_setup -> pending_approval -> active (or rejected)
    # Existing rows (created before this column existed) default to "active"
    # via the migration so already-live washes keep showing up for customers.
    status = Column(String, nullable=False, default="active", server_default="active")
    description = Column(String, nullable=True)
    # Per-weekday opening hours, e.g. {"sun": {"open": "08:00", "close": "22:00", "closed": false}, ...}
    working_hours = Column(JSON, nullable=True)