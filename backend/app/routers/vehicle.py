from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleResponse
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.get("/", response_model=List[VehicleResponse])
def my_vehicles(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    customer_id = int(current_user["sub"])
    return db.query(Vehicle).filter(Vehicle.customer_id == customer_id).all()

@router.post("/", response_model=VehicleResponse)
def add_vehicle(
    vehicle: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    customer_id = int(current_user["sub"])
    new_vehicle = Vehicle(**vehicle.model_dump(), customer_id=customer_id)
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return new_vehicle

@router.delete("/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    customer_id = int(current_user["sub"])
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.customer_id == customer_id
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="العربية غير موجودة")
    db.delete(vehicle)
    db.commit()
    return {"message": "تم حذف العربية"}