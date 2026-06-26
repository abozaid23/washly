from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone, date, timedelta
from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.user import User
from app.models.wash import Wash
from app.models.waitlist import WaitlistEntry
from app.schemas.booking import BookingCreate, BookingResponse
from app.utils.dependencies import get_current_user
from pydantic import BaseModel

class StatusUpdate(BaseModel):
    status: str

class QuickBooking(BaseModel):
    phone: str
    appointment_time: str

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def get_slot_count(db: Session, wash_id: int, appointment_time: datetime) -> int:
    window_start = appointment_time - timedelta(minutes=30)
    window_end   = appointment_time + timedelta(minutes=30)
    return db.query(Booking).filter(
        Booking.wash_id == wash_id,
        Booking.status.in_([BookingStatus.confirmed, BookingStatus.checked_in]),
        Booking.appointment_time >= window_start,
        Booking.appointment_time <= window_end,
    ).count()


def promote_waitlist(db: Session, wash_id: int, appointment_time: datetime):
    window_start = appointment_time - timedelta(minutes=30)
    window_end   = appointment_time + timedelta(minutes=30)
    entry = db.query(WaitlistEntry).filter(
        WaitlistEntry.wash_id == wash_id,
        WaitlistEntry.appointment_time >= window_start,
        WaitlistEntry.appointment_time <= window_end,
        WaitlistEntry.status == "pending",
    ).order_by(WaitlistEntry.created_at.asc()).first()

    if entry:
        new_booking = Booking(
            customer_id=entry.customer_id,
            wash_id=wash_id,
            appointment_time=entry.appointment_time,
            status=BookingStatus.confirmed,
        )
        db.add(new_booking)
        entry.status = "confirmed"
        try:
            db.commit()
        except Exception:
            db.rollback()


@router.get("/availability")
def check_availability(
    wash_id: int,
    appointment_time: str,
    db: Session = Depends(get_db),
):
    try:
        apt_time = datetime.fromisoformat(appointment_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="تنسيق الوقت غير صحيح")

    if apt_time.tzinfo is None:
        apt_time = apt_time.replace(tzinfo=timezone.utc)

    wash = db.query(Wash).filter(Wash.id == wash_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="المغسلة غير موجودة")

    capacity = wash.capacity or 3
    count = get_slot_count(db, wash_id, apt_time)

    return {
        "available": count < capacity,
        "booked": count,
        "capacity": capacity,
    }


@router.post("/", response_model=BookingResponse)
def create_booking(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    customer_id = int(current_user["sub"])
    appointment_time = booking.appointment_time
    if appointment_time.tzinfo is None:
        appointment_time = appointment_time.replace(tzinfo=timezone.utc)

    if appointment_time < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="لا يمكن الحجز في وقت قد فات")

    wash = db.query(Wash).filter(Wash.id == booking.wash_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="المغسلة غير موجودة")

    capacity = wash.capacity or 3
    if get_slot_count(db, booking.wash_id, appointment_time) >= capacity:
        raise HTTPException(status_code=400, detail="الموعد ممتلئ — يمكنك الانضمام لقائمة الانتظار")

    window_start = appointment_time - timedelta(minutes=60)
    window_end   = appointment_time + timedelta(minutes=60)
    existing = db.query(Booking).filter(
        Booking.customer_id == customer_id,
        Booking.wash_id == booking.wash_id,
        Booking.status.in_([BookingStatus.confirmed, BookingStatus.checked_in]),
        Booking.appointment_time >= window_start,
        Booking.appointment_time <= window_end,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="لديك حجز بالفعل في هذا الوقت في نفس المغسلة")

    new_booking = Booking(
        customer_id=customer_id,
        wash_id=booking.wash_id,
        appointment_time=appointment_time,
        vehicle_id=getattr(booking, "vehicle_id", None),
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


@router.post("/quick", response_model=BookingResponse)
def quick_booking(
    data: QuickBooking,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    supervisor_id = int(current_user["sub"])
    supervisor = db.query(User).filter(User.id == supervisor_id).first()
    if not supervisor or not supervisor.wash_id:
        raise HTTPException(status_code=400, detail="المشرف غير مرتبط بمغسلة")

    customer = db.query(User).filter(User.phone == data.phone).first()
    if not customer:
        raise HTTPException(status_code=404, detail="العميل غير موجود في النظام")

    appointment_time = datetime.fromisoformat(data.appointment_time)
    if appointment_time.tzinfo is None:
        appointment_time = appointment_time.replace(tzinfo=timezone.utc)
    if appointment_time < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="لا يمكن الحجز في وقت قد فات")

    new_booking = Booking(
        customer_id=customer.id,
        wash_id=supervisor.wash_id,
        appointment_time=appointment_time,
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


@router.get("/my", response_model=List[BookingResponse])
def my_bookings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    customer_id = int(current_user["sub"])
    return (
        db.query(Booking)
        .filter(Booking.customer_id == customer_id)
        .order_by(Booking.appointment_time.desc())
        .all()
    )


@router.get("/today", response_model=List[BookingResponse])
def today_bookings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.wash_id:
        raise HTTPException(status_code=400, detail="المستخدم غير مرتبط بمغسلة")

    today = date.today()
    return db.query(Booking).filter(
        Booking.wash_id == user.wash_id,
        Booking.appointment_time >= datetime.combine(today, datetime.min.time()),
        Booking.appointment_time <  datetime.combine(today, datetime.max.time()),
    ).all()


@router.patch("/{booking_id}/status", response_model=BookingResponse)
def update_booking_status(
    booking_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="الحجز غير موجود")

    try:
        new_status = BookingStatus(status_update.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="حالة غير صحيحة")

    wash_id          = booking.wash_id
    appointment_time = booking.appointment_time

    booking.status = new_status
    db.commit()
    db.refresh(booking)

    if new_status in [BookingStatus.cancelled, BookingStatus.no_show]:
        promote_waitlist(db, wash_id, appointment_time)

    return booking