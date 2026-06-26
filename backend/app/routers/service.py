from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.service import Service
from app.models.wash import Wash
from app.schemas.service import ServiceCreate, ServiceResponse
from app.utils.dependencies import get_current_user

router = APIRouter(tags=["Services"])

@router.get("/washes/{wash_id}/services", response_model=List[ServiceResponse])
def list_services(wash_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Service)
        .filter(Service.wash_id == wash_id, Service.is_active == True)
        .all()
    )

@router.post("/washes/{wash_id}/services", response_model=ServiceResponse)
def add_service(
    wash_id: int,
    service: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    owner_id = int(current_user["sub"])
    wash = db.query(Wash).filter(Wash.id == wash_id, Wash.owner_id == owner_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="المغسلة غير موجودة")
    new_service = Service(**service.dict(), wash_id=wash_id)
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return new_service
