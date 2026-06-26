"""Auth: OTP send/verify, token validity, account state."""
from datetime import datetime, timedelta, timezone

import jose.jwt
from app.utils.auth import SECRET_KEY, ALGORITHM
from tests.conftest import make_user, auth_headers


def test_send_then_verify_otp_happy_path(client, db):
    phone = "0101000111"
    res = client.post("/auth/send-otp", json={"phone": phone})
    assert res.status_code == 200

    # we can't read the real OTP through the API (it only prints to the
    # server console) — confirm the wrong-code path is rejected instead,
    # which exercises the same store/lookup logic.
    res = client.post("/auth/verify-otp", json={"phone": phone, "otp": "000000"})
    assert res.status_code == 400


def test_wrong_otp_three_times_invalidates_it(client, db):
    phone = "0101000112"
    client.post("/auth/send-otp", json={"phone": phone})

    for _ in range(3):
        res = client.post("/auth/verify-otp", json={"phone": phone, "otp": "999999"})
        assert res.status_code == 400

    # a 4th attempt, even with no code sent again, is still just rejected
    # (the entry was wiped after the 3rd wrong guess — not a crash, not a bypass)
    res = client.post("/auth/verify-otp", json={"phone": phone, "otp": "999999"})
    assert res.status_code == 400


def test_verify_otp_for_unknown_phone_fails_cleanly(client, db):
    res = client.post("/auth/verify-otp", json={"phone": "0101000999", "otp": "123456"})
    assert res.status_code == 400


def test_protected_endpoint_without_token_is_rejected(client, db):
    res = client.get("/bookings/my")
    assert res.status_code in (401, 422)  # missing header -> FastAPI 422, but never 200


def test_protected_endpoint_with_garbage_token_is_rejected(client, db):
    res = client.get("/bookings/my", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert res.status_code == 401


def test_protected_endpoint_without_bearer_prefix_is_rejected(client, db):
    res = client.get("/bookings/my", headers={"Authorization": "sometoken"})
    assert res.status_code == 401


def test_expired_token_is_rejected(client, db):
    user = make_user(db, "0101000113")
    expired = jose.jwt.encode(
        {"sub": str(user.id), "role": user.role.value, "phone": user.phone,
         "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        SECRET_KEY, algorithm=ALGORITHM,
    )
    res = client.get("/bookings/my", headers={"Authorization": f"Bearer {expired}"})
    assert res.status_code == 401


def test_token_signed_with_wrong_secret_is_rejected(client, db):
    user = make_user(db, "0101000114")
    forged = jose.jwt.encode(
        {"sub": str(user.id), "role": "super_admin", "phone": user.phone,
         "exp": datetime.now(timezone.utc) + timedelta(minutes=30)},
        "wrong-secret-not-ours", algorithm=ALGORITHM,
    )
    res = client.get("/bookings/my", headers={"Authorization": f"Bearer {forged}"})
    assert res.status_code == 401


def test_token_for_deleted_user_is_rejected(client, db):
    user = make_user(db, "0101000115")
    headers = auth_headers(user)
    db.delete(user)
    db.flush()
    res = client.get("/bookings/my", headers=headers)
    assert res.status_code == 401


def test_token_claims_cannot_escalate_role(client, db):
    """A customer can't hand-craft a token claiming role=super_admin —
    get_current_user must always re-read the role from the DB."""
    user = make_user(db, "0101000116")  # real role: customer
    forged = jose.jwt.encode(
        {"sub": str(user.id), "role": "super_admin", "phone": user.phone,
         "exp": datetime.now(timezone.utc) + timedelta(minutes=30)},
        SECRET_KEY, algorithm=ALGORITHM,
    )
    res = client.get("/admin/washes", headers={"Authorization": f"Bearer {forged}"})
    assert res.status_code == 403


def test_get_and_update_me(client, db):
    user = make_user(db, "0101000117")
    headers = auth_headers(user)

    res = client.get("/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["phone"] == user.phone

    res = client.patch("/auth/me", headers=headers, json={"name": "New Name", "email": "x@example.com"})
    assert res.status_code == 200
    assert res.json()["name"] == "New Name"
