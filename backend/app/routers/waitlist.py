from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.waitlist import WaitlistEntry
from app.utils.dependencies import get_current_user
from pydantic import BaseModel

class WaitlistCreate(BaseModel):
    wash_id: int
    appointment_time: datetime

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])


@router.post("/")
def join_waitlist(
    data: WaitlistCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    customer_id = int(current_user["sub"])
    appointment_time = data.appointment_time
    if appointment_time.tzinfo is None:
        appointment_time = appointment_time.replace(tzinfo=timezone.utc)

    window_start = appointment_time - timedelta(minutes=30)
    window_end   = appointment_time + timedelta(minutes=30)
    existing = db.query(WaitlistEntry).filter(
        WaitlistEntry.customer_id == customer_id,
        WaitlistEntry.wash_id == data.wash_id,
        WaitlistEntry.appointment_time >= window_start,
        WaitlistEntry.appointment_time <= window_end,
        WaitlistEntry.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="أنت بالفعل في قائمة الانتظار لهذا الموعد")

    entry = WaitlistEntry(
        customer_id=customer_id,
        wash_id=data.wash_id,
        appointment_time=appointment_time,
        status="pending",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"message": "تم إضافتك لقائمة الانتظار", "id": entry.id}


@router.get("/my")
def my_waitlist(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    customer_id = int(current_user["sub"])
    entries = (
        db.query(WaitlistEntry)
        .filter(
            WaitlistEntry.customer_id == customer_id,
            WaitlistEntry.status.in_(["pending", "confirmed"]),
        )
        .order_by(WaitlistEntry.appointment_time.asc())
        .all()
    )
    return [
        {
            "id": e.id,
            "wash_id": e.wash_id,
            "appointment_time": e.appointment_time.isoformat(),
            "status": e.status,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]