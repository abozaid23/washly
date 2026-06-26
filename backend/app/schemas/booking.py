from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class BookingCreate(BaseModel):
    wash_id: int
    appointment_time: datetime
    vehicle_id: Optional[int] = None
    service_ids: List[int] = []

class BookingResponse(BaseModel):
    id: int
    customer_id: int
    wash_id: int
    appointment_time: datetime
    status: str
    vehicle_id: Optional[int] = None
    access_code: Optional[str] = None
    total_price: float = 0
    total_minutes: int = 0

    class Config:
        from_attributes = True

class BookingDetailResponse(BookingResponse):
    wash_name: str
    wash_address: str
    vehicle_label: Optional[str] = None
    rated: bool = False

class CheckinRequest(BaseModel):
    access_code: str
