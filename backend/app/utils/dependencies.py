from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.utils.auth import verify_token

def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="المستخدم غير موجود")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="تم إيقاف حسابك، تواصل مع الدعم")

    # role/phone always read fresh from the DB — a token issued before a
    # role change (or before a suspension) must not keep acting on stale
    # claims until it naturally expires.
    payload["role"] = user.role.value
    payload["phone"] = user.phone
    return payload
