from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse
from app.utils.auth import create_access_token
from app.utils.otp import generate_otp, verify_otp

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