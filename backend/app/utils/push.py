import os

import firebase_admin
from firebase_admin import credentials, messaging

_firebase_app = None

_service_account_file = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE")

if _service_account_file and os.path.exists(_service_account_file):
    if not firebase_admin._apps:
        _firebase_app = firebase_admin.initialize_app(credentials.Certificate(_service_account_file))
    else:
        _firebase_app = firebase_admin.get_app()
else:
    print(f"[push] Firebase service account file not found ({_service_account_file}) — push notifications disabled")


def send_push(fcm_token: str | None, title: str, body: str) -> None:
    if not fcm_token or not _firebase_app:
        return
    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=fcm_token,
        )
        messaging.send(message)
    except Exception as e:
        print(f"[push] failed to send notification: {e}")
