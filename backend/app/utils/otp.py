import random
import string
from datetime import datetime, timedelta

otp_store = {}

def generate_otp(phone: str) -> str:
    otp = ''.join(random.choices(string.digits, k=6))
    otp_store[phone] = {
        "otp": otp,
        "expires_at": datetime.now() + timedelta(minutes=5)
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
        return False
    del otp_store[phone]
    return True