from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.wash import Wash
from app.schemas.wash import WashCreate, WashResponse
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/washes", tags=["Washes"])

@router.get("/", response_model=List[WashResponse])
def list_washes(db: Session = Depends(get_db)):
    return db.query(Wash).filter(Wash.is_active == True).all()

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