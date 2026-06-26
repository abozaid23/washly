from pydantic import BaseModel
from typing import Optional

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    vehicle_type: str = "all"

class ServiceResponse(BaseModel):
    id: int
    wash_id: int
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    vehicle_type: str
    is_active: bool

    class Config:
        from_attributes = True
