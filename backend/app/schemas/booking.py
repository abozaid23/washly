from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BookingCreate(BaseModel):
    wash_id: int
    appointment_time: datetime
    vehicle_id: Optional[int] = None

class BookingResponse(BaseModel):
    id: int
    customer_id: int
    wash_id: int
    appointment_time: datetime
    status: str
    vehicle_id: Optional[int] = None

    class Config:
        from_attributes = True