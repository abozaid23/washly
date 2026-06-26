from pydantic import BaseModel
from typing import Optional

class VehicleCreate(BaseModel):
    brand: str
    model: str
    year: int
    plate_number: str
    color: Optional[str] = None

class VehicleResponse(BaseModel):
    id: int
    customer_id: int
    brand: str
    model: str
    year: int
    plate_number: str
    color: Optional[str] = None

    class Config:
        from_attributes = True
        