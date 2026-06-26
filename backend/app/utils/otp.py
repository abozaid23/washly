import random
import string
from datetime import datetime, timedelta

otp_store = {}
otp_attempts = {}

MAX_SEND_PER_HOUR = 3
SEND_WINDOW = timedelta(hours=1)
MAX_VERIFY_ATTEMPTS = 3


def can_send_otp(phone: str) -> bool:
    """Rate limit: at most MAX_SEND_PER_HOUR OTP requests per phone per hour."""
    now = datetime.now()
    attempts = [t for t in otp_attempts.get(phone, []) if now - t < SEND_WINDOW]
    otp_attempts[phone] = attempts
    return len(attempts) < MAX_SEND_PER_HOUR


def generate_otp(phone: str) -> str:
    otp_attempts.setdefault(phone, []).append(datetime.now())
    otp = ''.join(random.choices(string.digits, k=6))
    otp_store[phone] = {
        "otp": otp,
        "expires_at": datetime.now() + timedelta(minutes=5),
        "wrong_attempts": 0,
    }
    return otp


def verify_otp(phone: str, otp: str) -> bool:
    if phone not in otp_store:
        return False
    data = otp_store[phone]
    if datetime.now() > data["expires_at"]:
        del otp_store[phone]
        return False
    if data["otp"] != otp:
        data["wrong_attempts"] += 1
        if data["wrong_attempts"] >= MAX_VERIFY_ATTEMPTS:
            del otp_store[phone]
        return False
    del otp_store[phone]
    return True
