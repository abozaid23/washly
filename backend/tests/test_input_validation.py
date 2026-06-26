"""Unvalidated input, SQL-injection-style payloads, and malformed
request shapes. Everything goes through the SQLAlchemy ORM (parameter
binding), so injection payloads should just be inert, literal strings —
never special-cased, never crash the app, never leak data."""
from app.models.user import UserRole
from app.models.vehicle import Vehicle
from tests.conftest import make_user, make_wash, auth_headers


SQLI_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "admin'--",
    "1=1; SELECT * FROM users",
]


def test_sql_injection_payloads_in_phone_are_inert(client, db):
    for payload in SQLI_PAYLOADS:
        res = client.post("/auth/send-otp", json={"phone": payload})
        # accepted as a literal (odd) phone string, not interpreted as SQL —
        # the important thing is the server doesn't 500 and doesn't leak rows
        assert res.status_code in (200, 429)


def test_sql_injection_payload_in_vehicle_fields_is_stored_literally(client, db):
    customer = make_user(db, "0101000401")
    headers = auth_headers(customer)
    payload = "Robert'); DROP TABLE vehicles;--"

    res = client.post("/vehicles/", headers=headers, json={
        "brand": payload, "model": "x", "year": 2020, "plate_number": "ABC",
    })
    assert res.status_code == 200
    assert res.json()["brand"] == payload  # stored as literal text, unharmed

    # table is still there and queryable
    res = client.get("/vehicles/", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_non_integer_path_param_is_422_not_500(client, db):
    customer = make_user(db, "0101000402")
    res = client.patch("/bookings/not-a-number/status", headers=auth_headers(customer), json={"status": "cancelled"})
    assert res.status_code == 422


def test_missing_required_fields_is_422(client, db):
    customer = make_user(db, "0101000403")
    res = client.post("/bookings/", headers=auth_headers(customer), json={})
    assert res.status_code == 422


def test_negative_and_zero_service_price_duration_rejected(client, db):
    owner = make_user(db, "0101000404", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    headers = auth_headers(owner)

    res = client.post(f"/washes/{wash.id}/services", headers=headers,
                       json={"name": "x", "price": -50, "duration_minutes": 30})
    assert res.status_code == 422

    res = client.post(f"/washes/{wash.id}/services", headers=headers,
                       json={"name": "x", "price": 50, "duration_minutes": 0})
    assert res.status_code == 422


def test_rating_out_of_range_is_rejected(client, db):
    owner = make_user(db, "0101000405", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    customer = make_user(db, "0101000406")

    from app.models.booking import Booking, BookingStatus
    from datetime import datetime, timedelta, timezone
    booking = Booking(
        customer_id=customer.id, wash_id=wash.id,
        appointment_time=datetime.now(timezone.utc) + timedelta(hours=1),
        status=BookingStatus.completed, access_code="555000",
    )
    db.add(booking)
    db.flush()

    for stars in (0, 6, -1):
        res = client.post(f"/bookings/{booking.id}/rate", headers=auth_headers(customer), json={"stars": stars})
        assert res.status_code == 422


def test_oversized_string_field_does_not_crash(client, db):
    customer = make_user(db, "0101000407")
    huge = "x" * 50000
    res = client.post("/vehicles/", headers=auth_headers(customer), json={
        "brand": huge, "model": "x", "year": 2020, "plate_number": "ABC",
    })
    # whatever the DB column limit allows or rejects, it must not 500
    assert res.status_code in (200, 400, 422)


def test_invalid_role_string_in_add_employee_is_rejected(client, db):
    owner = make_user(db, "0101000408", role=UserRole.owner)
    make_wash(db, owner.id)
    res = client.post("/admin/add-employee", headers=auth_headers(owner), json={
        "phone": "0101099000", "role": "super_admin",
    })
    assert res.status_code == 400
