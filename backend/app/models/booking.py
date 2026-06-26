from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum

class BookingStatus(enum.Enum):
    confirmed = "confirmed"
    checked_in = "checked_in"
    completed = "completed"
    no_show = "no_show"
    cancelled = "cancelled"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wash_id = Column(Integer, ForeignKey("washes.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    appointment_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(BookingStatus, create_type=False), default=BookingStatus.confirmed)
    created_at = Column(DateTime(timezone=True), server_default=func.now())