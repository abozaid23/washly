from pydantic import BaseModel
from typing import Optional

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

    class Config:
        from_attributes = True