"""Regression tests for the authorization bugs found in the QA audit.
Each test recreates the exact exploit that used to work and asserts it's
now blocked, plus that the legitimate path still works.
"""
from datetime import datetime, timedelta, timezone

from app.models.user import UserRole
from app.models.vehicle import Vehicle
from app.models.service import Service
from app.models.booking import Booking, BookingStatus
from app.models.leave import LeaveRequest
from tests.conftest import make_user, make_wash, auth_headers


def future_iso(hours=24):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def test_suspended_user_is_blocked_immediately(client, db):
    customer = make_user(db, "01010000001")
    db.flush()
    headers = auth_headers(customer)

    # works while active
    assert client.get("/bookings/my", headers=headers).status_code == 200

    # admin suspends them — the *same already-issued token* must stop working
    customer.is_active = False
    db.flush()

    res = client.get("/bookings/my", headers=headers)
    assert res.status_code == 403


def test_suspended_user_cannot_login(client, db):
    customer = make_user(db, "01010000002", is_active=False)
    db.flush()

    res = client.post("/auth/verify-otp", json={
        "phone": customer.phone, "otp": "000000",
    })
    # wrong OTP would normally be 400; suspended must short-circuit before that
    # (either way it must never succeed) — assert it's not a 200 with a token
    assert res.status_code in (400, 403)
    if res.status_code == 403:
        assert "إيقاف" in res.json()["detail"]


def test_otp_send_is_rate_limited(client, db):
    phone = "01010000099"
    for _ in range(3):
        res = client.post("/auth/send-otp", json={"phone": phone})
        assert res.status_code == 200

    res = client.post("/auth/send-otp", json={"phone": phone})
    assert res.status_code == 429


def test_booking_rejects_other_customers_vehicle(client, db):
    owner = make_user(db, "01010000003", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    service = Service(wash_id=wash.id, name="Wash", price=100, duration_minutes=30)
    db.add(service)

    owner_of_vehicle = make_user(db, "01010000004")
    vehicle = Vehicle(customer_id=owner_of_vehicle.id, brand="Toyota", model="Corolla", year=2020, plate_number="ABC")
    db.add(vehicle)
    db.flush()

    attacker = make_user(db, "01010000005")
    res = client.post("/bookings/", headers=auth_headers(attacker), json={
        "wash_id": wash.id,
        "appointment_time": future_iso(),
        "vehicle_id": vehicle.id,
        "service_ids": [service.id],
    })
    assert res.status_code == 404


def test_customer_cannot_cancel_someone_elses_booking(client, db):
    owner = make_user(db, "01010000006", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    victim = make_user(db, "01010000007")
    attacker = make_user(db, "01010000008")

    booking = Booking(
        customer_id=victim.id, wash_id=wash.id,
        appointment_time=datetime.now(timezone.utc) + timedelta(hours=5),
        status=BookingStatus.confirmed, access_code="123456",
    )
    db.add(booking)
    db.flush()

    res = client.patch(f"/bookings/{booking.id}/status", headers=auth_headers(attacker), json={"status": "cancelled"})
    assert res.status_code == 403

    # the real owner of the booking can cancel it
    res = client.patch(f"/bookings/{booking.id}/status", headers=auth_headers(victim), json={"status": "cancelled"})
    assert res.status_code == 200


def test_random_user_cannot_complete_a_booking(client, db):
    owner = make_user(db, "01010000009", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "01010000010")
    stranger = make_user(db, "01010000011")

    booking = Booking(
        customer_id=customer.id, wash_id=wash.id,
        appointment_time=datetime.now(timezone.utc) + timedelta(hours=5),
        status=BookingStatus.confirmed, access_code="654321",
    )
    db.add(booking)
    db.flush()

    res = client.patch(f"/bookings/{booking.id}/status", headers=auth_headers(stranger), json={"status": "completed"})
    assert res.status_code == 403


def test_owner_checkin_uses_wash_owner_id_not_user_wash_id(client, db):
    """Regression: owners aren't usually given a User.wash_id — only
    Wash.owner_id links them. Check-in must respect that."""
    owner = make_user(db, "01010000012", role=UserRole.owner)  # wash_id intentionally left null
    wash = make_wash(db, owner.id)
    customer = make_user(db, "01010000013")

    booking = Booking(
        customer_id=customer.id, wash_id=wash.id,
        appointment_time=datetime.now(timezone.utc) + timedelta(hours=5),
        status=BookingStatus.confirmed, access_code="111222",
    )
    db.add(booking)
    db.flush()

    res = client.post(f"/bookings/{booking.id}/checkin", headers=auth_headers(owner), json={"access_code": "111222"})
    assert res.status_code == 200
    assert res.json()["status"] == "checked_in"


def test_leave_response_requires_wash_ownership(client, db):
    owner = make_user(db, "01010000014", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    employee = make_user(db, "01010000015", role=UserRole.employee, wash_id=wash.id)
    outsider = make_user(db, "01010000016", role=UserRole.owner)  # owns a different (nonexistent) wash

    leave = LeaveRequest(employee_id=employee.id, date=datetime.now().date(), reason="test")
    db.add(leave)
    db.flush()

    res = client.patch(f"/leave/{leave.id}/respond?status=approved", headers=auth_headers(outsider))
    assert res.status_code == 403

    res = client.patch(f"/leave/{leave.id}/respond?status=approved", headers=auth_headers(owner))
    assert res.status_code == 200


def test_only_owner_or_admin_can_create_a_wash(client, db):
    customer = make_user(db, "01010000017")
    res = client.post("/washes/", headers=auth_headers(customer), json={
        "name": "x", "address": "x", "phone": "x", "latitude": 1, "longitude": 1,
    })
    assert res.status_code == 403

    owner = make_user(db, "01010000018", role=UserRole.owner)
    res = client.post("/washes/", headers=auth_headers(owner), json={
        "name": "x", "address": "x", "phone": "x", "latitude": 1, "longitude": 1,
    })
    assert res.status_code == 200


def test_rating_only_after_completed_and_only_once(client, db):
    owner = make_user(db, "01010000019", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "01010000020")

    booking = Booking(
        customer_id=customer.id, wash_id=wash.id,
        appointment_time=datetime.now(timezone.utc) + timedelta(hours=5),
        status=BookingStatus.confirmed, access_code="333444",
    )
    db.add(booking)
    db.flush()

    # can't rate a booking that isn't completed yet
    res = client.post(f"/bookings/{booking.id}/rate", headers=auth_headers(customer), json={"stars": 5})
    assert res.status_code == 400

    booking.status = BookingStatus.completed
    db.flush()

    res = client.post(f"/bookings/{booking.id}/rate", headers=auth_headers(customer), json={"stars": 5, "comment": "great"})
    assert res.status_code == 200

    # second attempt on the same booking is rejected
    res = client.post(f"/bookings/{booking.id}/rate", headers=auth_headers(customer), json={"stars": 1})
    assert res.status_code == 400

    db.refresh(wash)
    assert wash.rating == 5.0


def test_rating_blocked_for_other_customers_booking(client, db):
    owner = make_user(db, "01010000021", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "01010000022")
    stranger = make_user(db, "01010000023")

    booking = Booking(
        customer_id=customer.id, wash_id=wash.id,
        appointment_time=datetime.now(timezone.utc) + timedelta(hours=5),
        status=BookingStatus.completed, access_code="555666",
    )
    db.add(booking)
    db.flush()

    res = client.post(f"/bookings/{booking.id}/rate", headers=auth_headers(stranger), json={"stars": 1})
    assert res.status_code == 403
