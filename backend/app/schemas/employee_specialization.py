from pydantic import BaseModel

class SpecializationCreate(BaseModel):
    service_id: int

class SpecializationResponse(BaseModel):
    id: int
    employee_id: int
    service_id: int

    class Config:
        from_attributes = True
