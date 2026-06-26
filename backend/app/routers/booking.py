import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone, date, timedelta
from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.booking_service import BookingService
from app.models.service import Service
from app.models.user import User, UserRole
from app.models.wash import Wash
from app.models.vehicle import Vehicle
from app.models.waitlist import WaitlistEntry
from app.models.rating import Rating
from app.schemas.booking import BookingCreate, BookingResponse, BookingDetailResponse, CheckinRequest
from app.schemas.rating import RatingCreate, RatingResponse
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


def generate_access_code(db: Session) -> str:
    for _ in range(10):
        code = f"{random.randint(0, 999999):06d}"
        exists = db.query(Booking).filter(
            Booking.access_code == code,
            Booking.status.in_([BookingStatus.confirmed, BookingStatus.checked_in]),
        ).first()
        if not exists:
            return code
    return f"{random.randint(0, 999999):06d}"


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
            access_code=generate_access_code(db),
        )
        db.add(new_booking)
        entry.status = "confirmed"
        try:
            db.commit()
        except Exception:
            db.rollback()


def staff_owns_wash(db: Session, current_user: dict, wash_id: int) -> bool:
    """True if the authenticated staff member (owner/supervisor/employee) runs this wash."""
    role = current_user.get("role")
    uid = int(current_user["sub"])
    if role == "owner":
        return db.query(Wash).filter(Wash.owner_id == uid, Wash.id == wash_id).first() is not None
    if role in ("employee", "supervisor"):
        user = db.query(User).filter(User.id == uid).first()
        return bool(user and user.wash_id == wash_id)
    return False


def to_detail(db: Session, booking: Booking) -> BookingDetailResponse:
    wash = db.query(Wash).filter(Wash.id == booking.wash_id).first()
    vehicle_label = None
    if booking.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == booking.vehicle_id).first()
        if vehicle:
            vehicle_label = f"{vehicle.brand} {vehicle.model} · {vehicle.plate_number}"
    rated = db.query(Rating).filter(Rating.booking_id == booking.id).first() is not None
    return BookingDetailResponse(
        id=booking.id,
        customer_id=booking.customer_id,
        wash_id=booking.wash_id,
        appointment_time=booking.appointment_time,
        status=booking.status.value,
        vehicle_id=booking.vehicle_id,
        access_code=booking.access_code,
        total_price=booking.total_price or 0,
        total_minutes=booking.total_minutes or 0,
        rated=rated,
        wash_name=wash.name if wash else "",
        wash_address=wash.address if wash else "",
        vehicle_label=vehicle_label,
    )


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

    if booking.vehicle_id is not None:
        vehicle = db.query(Vehicle).filter(
            Vehicle.id == booking.vehicle_id,
            Vehicle.customer_id == customer_id,
        ).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="العربية غير موجودة")

    services = []
    if booking.service_ids:
        services = db.query(Service).filter(
            Service.id.in_(booking.service_ids),
            Service.wash_id == booking.wash_id,
        ).all()

    total_price = sum(s.price for s in services)
    total_minutes = sum(s.duration_minutes for s in services)

    new_booking = Booking(
        customer_id=customer_id,
        wash_id=booking.wash_id,
        appointment_time=appointment_time,
        vehicle_id=booking.vehicle_id,
        access_code=generate_access_code(db),
        total_price=total_price,
        total_minutes=total_minutes,
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    for service in services:
        db.add(BookingService(booking_id=new_booking.id, service_id=service.id))
    if services:
        db.commit()

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
        access_code=generate_access_code(db),
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


@router.get("/my", response_model=List[BookingDetailResponse])
def my_bookings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    customer_id = int(current_user["sub"])
    bookings = (
        db.query(Booking)
        .filter(Booking.customer_id == customer_id)
        .order_by(Booking.appointment_time.desc())
        .all()
    )
    return [to_detail(db, b) for b in bookings]


@router.get("/today", response_model=List[BookingDetailResponse])
def today_bookings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.wash_id:
        raise HTTPException(status_code=400, detail="المستخدم غير مرتبط بمغسلة")

    today = date.today()
    bookings = db.query(Booking).filter(
        Booking.wash_id == user.wash_id,
        Booking.appointment_time >= datetime.combine(today, datetime.min.time()),
        Booking.appointment_time <  datetime.combine(today, datetime.max.time()),
    ).order_by(Booking.appointment_time.asc()).all()
    return [to_detail(db, b) for b in bookings]


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

    if new_status == BookingStatus.checked_in:
        raise HTTPException(status_code=400, detail="لازم تستخدم كود الوصول لتسجيل الوصول")

    role = current_user.get("role")
    uid = int(current_user["sub"])

    if role == "customer":
        if booking.customer_id != uid:
            raise HTTPException(status_code=403, detail="غير مصرح لك")
        if new_status != BookingStatus.cancelled:
            raise HTTPException(status_code=403, detail="العميل يقدر يلغي الحجز بس")
        if booking.status != BookingStatus.confirmed:
            raise HTTPException(status_code=400, detail="مش ممكن تلغي الحجز ده دلوقتي")
    elif role in ("employee", "supervisor", "owner"):
        if not staff_owns_wash(db, current_user, booking.wash_id):
            raise HTTPException(status_code=403, detail="الحجز غير تابع لمغسلتك")
        if new_status == BookingStatus.completed and booking.status != BookingStatus.checked_in:
            raise HTTPException(status_code=400, detail="لازم العميل يوصل ويتأكد الكود الأول")
    else:
        raise HTTPException(status_code=403, detail="غير مصرح لك")

    wash_id          = booking.wash_id
    appointment_time = booking.appointment_time

    booking.status = new_status
    db.commit()
    db.refresh(booking)

    if new_status in [BookingStatus.cancelled, BookingStatus.no_show]:
        promote_waitlist(db, wash_id, appointment_time)

    return booking


@router.post("/{booking_id}/checkin", response_model=BookingResponse)
def checkin_booking(
    booking_id: int,
    data: CheckinRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ["employee", "supervisor", "owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="الحجز غير موجود")

    if not staff_owns_wash(db, current_user, booking.wash_id):
        raise HTTPException(status_code=403, detail="الحجز غير تابع لمغسلتك")

    if booking.status != BookingStatus.confirmed:
        raise HTTPException(status_code=400, detail="لا يمكن تأكيد الوصول لهذا الحجز في حالته الحالية")

    if not booking.access_code or booking.access_code != data.access_code.strip():
        raise HTTPException(status_code=400, detail="كود الوصول غير صحيح")

    booking.status = BookingStatus.checked_in
    db.commit()
    db.refresh(booking)
    return booking


@router.post("/{booking_id}/rate", response_model=RatingResponse)
def rate_booking(
    booking_id: int,
    data: RatingCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    customer_id = int(current_user["sub"])
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="الحجز غير موجود")
    if booking.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    if booking.status != BookingStatus.completed:
        raise HTTPException(status_code=400, detail="التقييم متاح بس بعد اكتمال الزيارة")

    existing = db.query(Rating).filter(Rating.booking_id == booking_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="تم تقييم الزيارة دي قبل كذا")

    rating = Rating(
        booking_id=booking_id,
        customer_id=customer_id,
        wash_id=booking.wash_id,
        stars=data.stars,
        comment=data.comment,
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)

    wash = db.query(Wash).filter(Wash.id == booking.wash_id).first()
    if wash:
        all_ratings = db.query(Rating).filter(Rating.wash_id == wash.id).all()
        wash.rating = sum(r.stars for r in all_ratings) / len(all_ratings)
        db.commit()

    return rating
