from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserRole(enum.Enum):
    customer = "customer"
    employee = "employee"
    supervisor = "supervisor"
    owner = "owner"
    super_admin = "super_admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    role = Column(Enum(UserRole, create_type=False), nullable=False)
    wash_id = Column(Integer, ForeignKey("washes.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    fcm_token = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())