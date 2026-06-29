from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.wash import Wash
from app.schemas.wash import WashCreate, WashResponse, WashSetupRequest
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/washes", tags=["Washes"])

@router.get("/", response_model=List[WashResponse])
def list_washes(db: Session = Depends(get_db)):
    # Customers should only ever see live washes — both flags are kept in
    # sync (is_active toggled by super_admin suspension, status driven by the
    # owner-onboarding/approval flow) so we require both to be true/active.
    return db.query(Wash).filter(Wash.is_active == True, Wash.status == "active").all()

@router.get("/my", response_model=List[WashResponse])
def my_washes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    owner_id = int(current_user["sub"])
    return db.query(Wash).filter(Wash.owner_id == owner_id).all()

@router.get("/{wash_id}", response_model=WashResponse)
def get_wash(wash_id: int, db: Session = Depends(get_db)):
    wash = db.query(Wash).filter(Wash.id == wash_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="Wash not found")
    return wash

@router.post("/", response_model=WashResponse)
def create_wash(
    wash: WashCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ("owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    owner_id = int(current_user["sub"])
    new_wash = Wash(**wash.model_dump(), owner_id=owner_id)
    db.add(new_wash)
    db.commit()
    db.refresh(new_wash)
    return new_wash


@router.patch("/{wash_id}/setup", response_model=WashResponse)
def setup_wash(
    wash_id: int,
    data: WashSetupRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Owner-onboarding wizard's final step: saves name/description/location/
    working hours and moves the wash from pending_setup into the
    super_admin's approval queue (pending_approval)."""
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    owner_id = int(current_user["sub"])
    wash = db.query(Wash).filter(Wash.id == wash_id, Wash.owner_id == owner_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="المغسلة غير موجودة")

    if data.name is not None:
        wash.name = data.name
    if data.description is not None:
        wash.description = data.description
    if data.latitude is not None:
        wash.latitude = data.latitude
    if data.longitude is not None:
        wash.longitude = data.longitude
    if data.working_hours is not None:
        wash.working_hours = data.working_hours

    wash.status = "pending_approval"
    db.commit()
    db.refresh(wash)
    return wash