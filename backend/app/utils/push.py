import json
import os

import firebase_admin
from firebase_admin import credentials, messaging

_firebase_app = None

_service_account_file = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE")
_service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

_cert = None
if _service_account_file and os.path.exists(_service_account_file):
    _cert = credentials.Certificate(_service_account_file)
elif _service_account_json:
    # Hosting platforms like Railway don't support uploading the JSON file
    # directly — the whole file contents are pasted into this env var instead.
    _cert = credentials.Certificate(json.loads(_service_account_json))

if _cert:
    _firebase_app = firebase_admin.get_app() if firebase_admin._apps else firebase_admin.initialize_app(_cert)
else:
    print("[push] no Firebase service account configured — push notifications disabled")


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
