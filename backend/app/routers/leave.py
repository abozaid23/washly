from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.database import get_db
from app.models.leave import LeaveRequest
from app.models.wash import Wash
from app.utils.dependencies import get_current_user
from pydantic import BaseModel

class LeaveRequestCreate(BaseModel):
    date: date
    reason: str

class LeaveRequestResponse(BaseModel):
    id: int
    employee_id: int
    date: date
    reason: str
    status: str

    class Config:
        from_attributes = True

router = APIRouter(prefix="/leave", tags=["Leave"])

@router.post("/request", response_model=LeaveRequestResponse)
def request_leave(
    data: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    employee_id = int(current_user["sub"])
    new_leave = LeaveRequest(
        employee_id=employee_id,
        date=data.date,
        reason=data.reason
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)
    return new_leave

@router.get("/my", response_model=List[LeaveRequestResponse])
def my_leaves(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    employee_id = int(current_user["sub"])
    return db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee_id).all()

@router.get("/pending")
def pending_leaves(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    owner_id = int(current_user["sub"])
    wash = db.query(Wash).filter(Wash.owner_id == owner_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="لا توجد مغسلة مرتبطة بحسابك")

    from app.models.user import User
    employees = db.query(User).filter(User.wash_id == wash.id).all()
    emp_ids = [e.id for e in employees]

    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id.in_(emp_ids),
        LeaveRequest.status == "pending"
    ).all()

    return [{"id": l.id, "employee_id": l.employee_id, "date": str(l.date), "reason": l.reason, "status": l.status} for l in leaves]

@router.patch("/{leave_id}/respond")
def respond_leave(
    leave_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="الحالة يجب أن تكون approved أو rejected")

    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")

    leave.status = status
    db.commit()
    return {"message": "تم تحديث الطلب", "status": status}