from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RatingCreate(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = None

class RatingResponse(BaseModel):
    id: int
    booking_id: int
    wash_id: int
    stars: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
