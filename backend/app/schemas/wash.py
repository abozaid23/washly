from pydantic import BaseModel
from typing import Optional, Any

class WashCreate(BaseModel):
    name: str
    address: str
    phone: str
    latitude: float
    longitude: float
    logo_url: Optional[str] = None
    opening_time: str = "08:00"
    closing_time: str = "22:00"

class WashResponse(BaseModel):
    id: int
    name: str
    address: str
    phone: str
    latitude: float
    longitude: float
    logo_url: Optional[str] = None
    rating: float
    opening_time: str
    closing_time: str
    is_active: bool
    is_open_now: bool
    status: str = "active"
    description: Optional[str] = None
    working_hours: Optional[Any] = None

    class Config:
        from_attributes = True


class WashSetupRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    working_hours: Optional[dict] = None