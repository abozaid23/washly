from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse
from app.utils.auth import create_access_token
from app.utils.dependencies import get_current_user
from app.utils.otp import can_send_otp, generate_otp, verify_otp

router = APIRouter(prefix="/auth", tags=["Authentication"])


def normalize_phone(phone: str) -> str:
    """دايماً يخزن الرقم بدون +2"""
    phone = phone.strip()
    if phone.startswith("+2"):
        phone = phone[2:]
    return phone


@router.post("/send-otp")
def send_otp(request: SendOTPRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(request.phone)
    if not can_send_otp(phone):
        raise HTTPException(
            status_code=429,
            detail="عدد محاولات كبير، حاول تاني بعد ساعة",
        )
    otp = generate_otp(phone)
    print(f"OTP for {phone}: {otp}")
    return {"message": "OTP sent successfully"}


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp_route(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(request.phone)

    if not verify_otp(phone, request.otp):
        raise HTTPException(status_code=400, detail="الكود غير صحيح أو منتهي الصلاحية")

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            name=request.name,
            role=UserRole.customer,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.is_active:
        raise HTTPException(status_code=403, detail="تم إيقاف حسابك، تواصل مع الدعم")

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role.value,
        "phone": user.phone,
    })

    return TokenResponse(
        access_token=token,
        role=user.role.value,
        name=user.name,
    )


@router.get("/me")
def get_me(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    return {
        "id": user.id,
        "phone": user.phone,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
    }


class UpdateMeRequest(BaseModel):
    name: str | None = None
    email: str | None = None


@router.patch("/me")
def update_me(
    data: UpdateMeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if data.name is not None:
        user.name = data.name
    if data.email is not None:
        user.email = data.email
    db.commit()
    return {
        "id": user.id,
        "phone": user.phone,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
    }


class FcmTokenUpdate(BaseModel):
    fcm_token: str


@router.patch("/fcm-token")
def update_fcm_token(
    data: FcmTokenUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    user.fcm_token = data.fcm_token
    db.commit()
    return {"message": "تم تسجيل التوكين بنجاح"}