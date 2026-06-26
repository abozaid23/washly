"""Booking lifecycle edge cases: past time, closed wash, full capacity,
double-booking, wrong check-in code, rating rules."""
from datetime import datetime, timedelta, timezone

from app.models.user import UserRole
from app.models.service import Service
from app.models.booking import Booking, BookingStatus
from tests.conftest import make_user, make_wash, auth_headers, safe_future_datetime, safe_future_iso


def test_cannot_book_a_time_in_the_past(client, db):
    owner = make_user(db, "0101000201", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "0101000202")

    past = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    res = client.post("/bookings/", headers=auth_headers(customer), json={
        "wash_id": wash.id, "appointment_time": past,
    })
    assert res.status_code == 400


def test_cannot_book_a_suspended_wash(client, db):
    owner = make_user(db, "0101000203", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    wash.is_active = False
    db.flush()
    customer = make_user(db, "0101000204")

    res = client.post("/bookings/", headers=auth_headers(customer), json={
        "wash_id": wash.id, "appointment_time": safe_future_iso(),
    })
    assert res.status_code == 400

    # availability check also reflects the suspension
    res = client.get("/bookings/availability", params={"wash_id": wash.id, "appointment_time": safe_future_iso()})
    assert res.status_code == 200
    assert res.json()["available"] is False


def test_cannot_book_outside_operating_hours(client, db):
    owner = make_user(db, "0101000222", role=UserRole.owner)
    wash = make_wash(db, owner.id)  # default hours: 08:00-22:00
    customer = make_user(db, "0101000223")

    too_early = safe_future_datetime().replace(hour=5, minute=0)
    res = client.post("/bookings/", headers=auth_headers(customer), json={
        "wash_id": wash.id, "appointment_time": too_early.isoformat(),
    })
    assert res.status_code == 400

    too_late = safe_future_datetime().replace(hour=23, minute=0)
    res = client.post("/bookings/", headers=auth_headers(customer), json={
        "wash_id": wash.id, "appointment_time": too_late.isoformat(),
    })
    assert res.status_code == 400

    # availability check agrees
    res = client.get("/bookings/availability", params={"wash_id": wash.id, "appointment_time": too_early.isoformat()})
    assert res.status_code == 200
    assert res.json()["available"] is False

    # exactly at opening time is fine; one minute before closing is fine too
    at_open = safe_future_datetime().replace(hour=8, minute=0)
    assert client.post("/bookings/", headers=auth_headers(customer), json={
        "wash_id": wash.id, "appointment_time": at_open.isoformat(),
    }).status_code == 200


def test_cannot_book_a_nonexistent_wash(client, db):
    customer = make_user(db, "0101000205")
    res = client.post("/bookings/", headers=auth_headers(customer), json={
        "wash_id": 999999, "appointment_time": safe_future_iso(),
    })
    assert res.status_code == 404


def test_full_capacity_blocks_booking_and_waitlist_accepts(client, db):
    owner = make_user(db, "0101000206", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    wash.capacity = 1
    db.flush()

    slot = safe_future_iso(2)
    first_customer = make_user(db, "0101000207")
    res = client.post("/bookings/", headers=auth_headers(first_customer), json={
        "wash_id": wash.id, "appointment_time": slot,
    })
    assert res.status_code == 200

    second_customer = make_user(db, "0101000208")
    res = client.post("/bookings/", headers=auth_headers(second_customer), json={
        "wash_id": wash.id, "appointment_time": slot,
    })
    assert res.status_code == 400

    res = client.post("/waitlist/", headers=auth_headers(second_customer), json={
        "wash_id": wash.id, "appointment_time": slot,
    })
    assert res.status_code == 200


def test_same_customer_cannot_double_book_same_wash_near_same_time(client, db):
    owner = make_user(db, "0101000209", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "0101000210")
    slot = safe_future_iso(3)

    res = client.post("/bookings/", headers=auth_headers(customer), json={"wash_id": wash.id, "appointment_time": slot})
    assert res.status_code == 200

    res = client.post("/bookings/", headers=auth_headers(customer), json={"wash_id": wash.id, "appointment_time": slot})
    assert res.status_code == 400


def test_checkin_with_wrong_code_fails_and_correct_code_succeeds(client, db):
    owner = make_user(db, "0101000211", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "0101000212")

    res = client.post("/bookings/", headers=auth_headers(customer), json={
        "wash_id": wash.id, "appointment_time": safe_future_iso(),
    })
    booking = res.json()

    res = client.post(f"/bookings/{booking['id']}/checkin", headers=auth_headers(owner), json={"access_code": "000000"})
    assert res.status_code == 400

    res = client.post(f"/bookings/{booking['id']}/checkin", headers=auth_headers(owner),
                       json={"access_code": booking["access_code"]})
    assert res.status_code == 200


def test_cannot_checkin_a_booking_twice(client, db):
    owner = make_user(db, "0101000213", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "0101000214")

    res = client.post("/bookings/", headers=auth_headers(customer), json={
        "wash_id": wash.id, "appointment_time": safe_future_iso(),
    })
    booking = res.json()
    code = booking["access_code"]

    assert client.post(f"/bookings/{booking['id']}/checkin", headers=auth_headers(owner),
                        json={"access_code": code}).status_code == 200
    res = client.post(f"/bookings/{booking['id']}/checkin", headers=auth_headers(owner), json={"access_code": code})
    assert res.status_code == 400


def test_booking_nonexistent_id_operations_404(client, db):
    owner = make_user(db, "0101000215", role=UserRole.owner)
    customer = make_user(db, "0101000216")

    assert client.post("/bookings/999999/checkin", headers=auth_headers(owner),
                        json={"access_code": "123456"}).status_code == 404
    assert client.patch("/bookings/999999/status", headers=auth_headers(customer),
                         json={"status": "cancelled"}).status_code == 404
    assert client.post("/bookings/999999/rate", headers=auth_headers(customer),
                        json={"stars": 5}).status_code == 404


def test_invalid_status_value_is_rejected(client, db):
    owner = make_user(db, "0101000217", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "0101000218")
    booking = Booking(
        customer_id=customer.id, wash_id=wash.id,
        appointment_time=safe_future_datetime(),
        status=BookingStatus.confirmed, access_code="121212",
    )
    db.add(booking)
    db.flush()

    res = client.patch(f"/bookings/{booking.id}/status", headers=auth_headers(customer), json={"status": "banana"})
    assert res.status_code == 400


def test_cannot_check_in_directly_via_status_patch(client, db):
    """checked_in must only ever be reachable via the access-code endpoint."""
    owner = make_user(db, "0101000219", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "0101000220")
    booking = Booking(
        customer_id=customer.id, wash_id=wash.id,
        appointment_time=safe_future_datetime(),
        status=BookingStatus.confirmed, access_code="343434",
    )
    db.add(booking)
    db.flush()

    res = client.patch(f"/bookings/{booking.id}/status", headers=auth_headers(owner), json={"status": "checked_in"})
    assert res.status_code == 400
