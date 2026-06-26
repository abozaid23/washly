import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.database import SessionLocal, get_db
from app.models.user import User, UserRole
from app.models.wash import Wash
from app.utils.auth import create_access_token
from main import app

# All test fixtures use phone numbers starting with this — never a real one.
TEST_PHONE_PREFIX = "0101000"

_CLEANUP_SQL = [
    "DELETE FROM ratings WHERE wash_id IN (SELECT id FROM washes WHERE owner_id IN (SELECT id FROM users WHERE phone LIKE :prefix))",
    "DELETE FROM booking_services WHERE booking_id IN (SELECT id FROM bookings WHERE wash_id IN (SELECT id FROM washes WHERE owner_id IN (SELECT id FROM users WHERE phone LIKE :prefix)) OR customer_id IN (SELECT id FROM users WHERE phone LIKE :prefix))",
    "DELETE FROM bookings WHERE wash_id IN (SELECT id FROM washes WHERE owner_id IN (SELECT id FROM users WHERE phone LIKE :prefix)) OR customer_id IN (SELECT id FROM users WHERE phone LIKE :prefix)",
    "UPDATE users SET wash_id = NULL WHERE phone LIKE :prefix",
    "DELETE FROM washes WHERE owner_id IN (SELECT id FROM users WHERE phone LIKE :prefix)",
    "DELETE FROM vehicles WHERE customer_id IN (SELECT id FROM users WHERE phone LIKE :prefix)",
    "DELETE FROM leave_requests WHERE employee_id IN (SELECT id FROM users WHERE phone LIKE :prefix)",
    "DELETE FROM users WHERE phone LIKE :prefix",
]


def _cleanup_test_rows():
    """Tests run against the real dev DB (route handlers call db.commit()
    themselves, so a simple transaction rollback in the fixture isn't
    enough). Sweep up anything tagged with TEST_PHONE_PREFIX after every
    test, in a fresh session, regardless of pass/fail."""
    cleanup_session = SessionLocal()
    try:
        for stmt in _CLEANUP_SQL:
            cleanup_session.execute(text(stmt), {"prefix": f"{TEST_PHONE_PREFIX}%"})
        cleanup_session.commit()
    finally:
        cleanup_session.close()


@pytest.fixture()
def db():
    session = SessionLocal()

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield session
    finally:
        session.close()
        app.dependency_overrides.pop(get_db, None)
        _cleanup_test_rows()


@pytest.fixture()
def client(db):
    return TestClient(app)


def make_user(db, phone, role=UserRole.customer, wash_id=None, is_active=True):
    assert phone.startswith(TEST_PHONE_PREFIX), "test users must use the reserved test phone prefix"
    user = User(phone=phone, name=f"Test {phone}", role=role, wash_id=wash_id, is_active=is_active)
    db.add(user)
    db.flush()
    return user


def make_wash(db, owner_id, name="Test Wash", commission_percent=15.0):
    wash = Wash(
        name=name,
        owner_id=owner_id,
        address="Test address",
        phone="0100000000",
        latitude=30.0,
        longitude=31.0,
        commission_percent=commission_percent,
        capacity=3,
    )
    db.add(wash)
    db.flush()
    return wash


def token_for(user):
    return create_access_token({"sub": str(user.id), "role": user.role.value, "phone": user.phone})


def auth_headers(user):
    return {"Authorization": f"Bearer {token_for(user)}"}
