from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.wash import Wash
from app.models.booking import Booking, BookingStatus
from app.routers.booking import to_detail
from app.schemas.booking import BookingDetailResponse
from app.utils.dependencies import get_current_user
from app.routers.auth import normalize_phone
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/admin", tags=["Admin"])

class AddEmployeeRequest(BaseModel):
    phone: str
    name: str = None
    role: str = "employee"

class CreateWashOwnerRequest(BaseModel):
    wash_name: str
    owner_name: str
    owner_phone: str

def check_super_admin(current_user: dict):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")

def check_owner_or_admin(current_user: dict):
    if current_user.get("role") not in ["owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك")

def check_ops_access(current_user: dict):
    """Owner, supervisor, or super_admin — operational (non-financial) views."""
    if current_user.get("role") not in ["owner", "supervisor", "super_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك")

def get_my_wash(db: Session, current_user: dict) -> Wash | None:
    role = current_user.get("role")
    uid = int(current_user["sub"])
    if role == "owner":
        return db.query(Wash).filter(Wash.owner_id == uid).first()
    if role in ("employee", "supervisor"):
        user = db.query(User).filter(User.id == uid).first()
        if user and user.wash_id:
            return db.query(Wash).filter(Wash.id == user.wash_id).first()
    return None

@router.get("/washes")
def get_all_washes(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    washes = db.query(Wash).all()
    return [{"id": w.id, "name": w.name, "address": w.address, "phone": w.phone, "is_active": w.is_active, "is_open_now": w.is_open_now, "opening_time": w.opening_time, "closing_time": w.closing_time, "commission_percent": w.commission_percent, "status": w.status} for w in washes]

@router.get("/users")
def get_all_users(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    users = db.query(User).all()
    return [{"id": u.id, "phone": u.phone, "name": u.name, "role": u.role.value, "is_active": u.is_active} for u in users]

@router.get("/bookings")
def get_all_bookings(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    bookings = db.query(Booking).all()
    return [{"id": b.id, "customer_id": b.customer_id, "wash_id": b.wash_id, "status": b.status.value, "appointment_time": b.appointment_time, "created_at": b.created_at} for b in bookings]

@router.patch("/washes/{wash_id}/toggle")
def toggle_wash(wash_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    wash = db.query(Wash).filter(Wash.id == wash_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="المغسلة غير موجودة")
    wash.is_active = not wash.is_active
    db.commit()
    return {"message": "تم التحديث", "is_active": wash.is_active}

@router.patch("/users/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    current_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if user.role == UserRole.super_admin:
        raise HTTPException(status_code=403, detail="لا يمكن إيقاف حساب الأدمن")
    if user.id == current_id:
        raise HTTPException(status_code=403, detail="لا يمكنك إيقاف حسابك الخاص")
    user.is_active = not user.is_active
    db.commit()
    return {"message": "تم التحديث", "is_active": user.is_active}

@router.get("/revenue")
def get_revenue(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    washes = db.query(Wash).all()
    total = 0.0
    result = []
    for wash in washes:
        completed_bookings = db.query(Booking).filter(
            Booking.wash_id == wash.id,
            Booking.status == BookingStatus.completed
        ).all()
        wash_total = sum(b.total_price or 0 for b in completed_bookings)
        commission_due = wash_total * (wash.commission_percent / 100)
        total += commission_due
        result.append({
            "wash_id": wash.id,
            "wash_name": wash.name,
            "completed_bookings": len(completed_bookings),
            "total_revenue": wash_total,
            "commission_percent": wash.commission_percent,
            "commission_due": commission_due,
        })
    return {"total_commission_due": total, "washes": result}


@router.get("/my-wash")
def get_my_wash_endpoint(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_ops_access(current_user)
    wash = get_my_wash(db, current_user)
    if not wash:
        raise HTTPException(status_code=404, detail="لا توجد مغسلة مرتبطة بحسابك")
    return {"id": wash.id, "name": wash.name, "address": wash.address, "commission_percent": wash.commission_percent}

@router.get("/my-revenue")
def get_my_revenue(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_owner_or_admin(current_user)
    owner_id = int(current_user["sub"])
    wash = db.query(Wash).filter(Wash.owner_id == owner_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="لا توجد مغسلة مرتبطة بحسابك")

    completed_bookings = db.query(Booking).filter(
        Booking.wash_id == wash.id,
        Booking.status == BookingStatus.completed
    ).all()
    upcoming_count = db.query(Booking).filter(
        Booking.wash_id == wash.id,
        Booking.status.in_([BookingStatus.confirmed, BookingStatus.checked_in])
    ).count()

    gross_revenue = sum(b.total_price or 0 for b in completed_bookings)
    commission_due = gross_revenue * (wash.commission_percent / 100)

    return {
        "wash_name": wash.name,
        "commission_percent": wash.commission_percent,
        "completed_bookings": len(completed_bookings),
        "upcoming_bookings": upcoming_count,
        "gross_revenue": gross_revenue,
        "commission_due": commission_due,
        "net_revenue": gross_revenue - commission_due,
    }

@router.get("/audit")
def get_audit_log(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    bookings = db.query(Booking).order_by(Booking.created_at.desc()).limit(50).all()
    return [{"id": b.id, "customer_id": b.customer_id, "wash_id": b.wash_id, "status": b.status.value, "appointment_time": b.appointment_time, "created_at": b.created_at} for b in bookings]

# ===== Owner Endpoints =====

@router.get("/my-employees")
def get_my_employees(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_ops_access(current_user)
    wash = get_my_wash(db, current_user)
    if not wash:
        raise HTTPException(status_code=404, detail="لا توجد مغسلة مرتبطة بحسابك")
    employees = db.query(User).filter(
        User.wash_id == wash.id,
        User.role.in_([UserRole.employee, UserRole.supervisor])
    ).all()
    return [{"id": e.id, "phone": e.phone, "name": e.name, "role": e.role.value, "is_active": e.is_active} for e in employees]


@router.get("/my-bookings", response_model=List[BookingDetailResponse])
def get_my_bookings(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_ops_access(current_user)
    wash = get_my_wash(db, current_user)
    if not wash:
        raise HTTPException(status_code=404, detail="لا توجد مغسلة مرتبطة بحسابك")
    bookings = (
        db.query(Booking)
        .filter(Booking.wash_id == wash.id)
        .order_by(Booking.appointment_time.desc())
        .limit(100)
        .all()
    )
    return [to_detail(db, b) for b in bookings]

@router.post("/add-employee")
def add_employee(request: AddEmployeeRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_owner_or_admin(current_user)
    owner_id = int(current_user["sub"])
    wash = db.query(Wash).filter(Wash.owner_id == owner_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="لا توجد مغسلة مرتبطة بحسابك")

    try:
        role_enum = UserRole(request.role)
        if role_enum not in [UserRole.employee, UserRole.supervisor]:
            raise HTTPException(status_code=400, detail="الدور يجب أن يكون employee أو supervisor")
    except ValueError:
        raise HTTPException(status_code=400, detail="دور غير صحيح")

    user = db.query(User).filter(User.phone == request.phone).first()
    if user:
        # منع تغيير دور الـ owner أو super_admin أو موظف عند مغسلة تانية
        protected_roles = [UserRole.owner, UserRole.super_admin]
        if user.role in protected_roles:
            raise HTTPException(status_code=403, detail="لا يمكن تعيين هذا الحساب كموظف")
        if user.wash_id and user.wash_id != wash.id:
            raise HTTPException(status_code=400, detail="هذا الموظف مرتبط بمغسلة أخرى بالفعل")
        user.wash_id = wash.id
        user.role = role_enum
        if request.name:
            user.name = request.name
    else:
        user = User(phone=request.phone, name=request.name, role=role_enum, wash_id=wash.id)
        db.add(user)

    db.commit()
    db.refresh(user)
    return {"message": "تم إضافة الموظف بنجاح", "employee": {"id": user.id, "phone": user.phone, "name": user.name, "role": user.role.value}}

@router.delete("/remove-employee/{user_id}")
def remove_employee(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_owner_or_admin(current_user)
    owner_id = int(current_user["sub"])
    wash = db.query(Wash).filter(Wash.owner_id == owner_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="لا توجد مغسلة مرتبطة بحسابك")
    user = db.query(User).filter(User.id == user_id, User.wash_id == wash.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    user.wash_id = None
    user.role = UserRole.customer
    db.commit()
    return {"message": "تم إزالة الموظف"}


# ===== Super-admin: create a new wash + its owner =====

@router.post("/create-wash-owner")
def create_wash_owner(
    request: CreateWashOwnerRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    check_super_admin(current_user)

    phone = normalize_phone(request.owner_phone)
    if len(phone) < 10 or not phone.isdigit():
        raise HTTPException(status_code=400, detail="اكتب رقم تليفون صحيح لصاحب المغسلة")
    request.owner_phone = phone

    owner = db.query(User).filter(User.phone == request.owner_phone).first()
    if owner:
        # حساب موجود بالفعل — نرقّيه لـ owner لو لسه مش owner (لكن من غير ما
        # نلمس super_admin أو owner تابع لمغسلة تانية أصلاً)
        if owner.role == UserRole.super_admin:
            raise HTTPException(status_code=403, detail="لا يمكن تحويل حساب الأدمن لصاحب مغسلة")
        if owner.role != UserRole.owner:
            owner.role = UserRole.owner
        if request.owner_name:
            owner.name = request.owner_name
    else:
        owner = User(phone=request.owner_phone, name=request.owner_name, role=UserRole.owner)
        db.add(owner)
        db.flush()  # need owner.id before creating the wash

    new_wash = Wash(
        name=request.wash_name,
        owner_id=owner.id,
        address="",
        phone=request.owner_phone,
        latitude=0.0,
        longitude=0.0,
        status="pending_setup",
    )
    db.add(new_wash)
    db.commit()
    db.refresh(new_wash)
    db.refresh(owner)

    return {
        "message": "تم إنشاء المغسلة بنجاح",
        "wash": {"id": new_wash.id, "name": new_wash.name, "status": new_wash.status},
        "owner": {"id": owner.id, "phone": owner.phone, "name": owner.name},
    }


# ===== Super-admin: wash approval queue =====

@router.get("/washes/pending-approval")
def get_pending_approval_washes(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    washes = db.query(Wash).filter(Wash.status == "pending_approval").all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "address": w.address,
            "phone": w.phone,
            "description": w.description,
            "owner_id": w.owner_id,
        }
        for w in washes
    ]


@router.patch("/washes/{wash_id}/approve")
def approve_wash(wash_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    wash = db.query(Wash).filter(Wash.id == wash_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="المغسلة غير موجودة")
    wash.status = "active"
    db.commit()
    return {"message": "تمت الموافقة على المغسلة", "status": wash.status}


@router.patch("/washes/{wash_id}/reject")
def reject_wash(wash_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    check_super_admin(current_user)
    wash = db.query(Wash).filter(Wash.id == wash_id).first()
    if not wash:
        raise HTTPException(status_code=404, detail="المغسلة غير موجودة")
    wash.status = "rejected"
    db.commit()
    return {"message": "تم رفض المغسلة", "status": wash.status}