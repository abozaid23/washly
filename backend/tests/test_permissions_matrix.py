"""Cross-role access matrix: every role tried against endpoints it must
not be able to use."""
from app.models.user import UserRole
from tests.conftest import make_user, make_wash, auth_headers


def test_customer_cannot_access_any_admin_endpoint(client, db):
    customer = make_user(db, "0101000301")
    headers = auth_headers(customer)
    for path in ["/admin/washes", "/admin/users", "/admin/bookings", "/admin/revenue", "/admin/audit"]:
        res = client.get(path, headers=headers)
        assert res.status_code == 403, path


def test_customer_cannot_access_owner_endpoints(client, db):
    customer = make_user(db, "0101000302")
    headers = auth_headers(customer)
    assert client.get("/admin/my-revenue", headers=headers).status_code == 403
    assert client.get("/admin/my-employees", headers=headers).status_code == 403
    assert client.post("/admin/add-employee", headers=headers,
                        json={"phone": "0101099999", "role": "employee"}).status_code == 403


def test_employee_cannot_access_admin_or_owner_financial_endpoints(client, db):
    owner = make_user(db, "0101000303", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    employee = make_user(db, "0101000304", role=UserRole.employee, wash_id=wash.id)
    headers = auth_headers(employee)

    assert client.get("/admin/washes", headers=headers).status_code == 403
    assert client.get("/admin/my-revenue", headers=headers).status_code == 403
    assert client.post("/admin/add-employee", headers=headers,
                        json={"phone": "0101099998", "role": "employee"}).status_code == 403


def test_supervisor_cannot_see_revenue_or_manage_staff(client, db):
    owner = make_user(db, "0101000305", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    supervisor = make_user(db, "0101000306", role=UserRole.supervisor, wash_id=wash.id)
    headers = auth_headers(supervisor)

    # supervisor CAN view ops data (today's bookings, staff list)...
    assert client.get("/bookings/today", headers=headers).status_code == 200
    assert client.get("/admin/my-employees", headers=headers).status_code == 200

    # ...but never revenue, network-wide data, or staff management
    assert client.get("/admin/my-revenue", headers=headers).status_code == 403
    assert client.get("/admin/washes", headers=headers).status_code == 403
    assert client.post("/admin/add-employee", headers=headers,
                        json={"phone": "0101099997", "role": "employee"}).status_code == 403


def test_owner_cannot_access_super_admin_only_endpoints(client, db):
    owner = make_user(db, "0101000307", role=UserRole.owner)
    headers = auth_headers(owner)
    for path in ["/admin/washes", "/admin/users", "/admin/bookings", "/admin/revenue", "/admin/audit"]:
        assert client.get(path, headers=headers).status_code == 403, path


def test_owner_cannot_manage_a_wash_that_isnt_theirs(client, db):
    owner_a = make_user(db, "0101000308", role=UserRole.owner)
    owner_b = make_user(db, "0101000309", role=UserRole.owner)
    wash_a = make_wash(db, owner_a.id)

    res = client.get(f"/washes/{wash_a.id}/services/manage", headers=auth_headers(owner_b))
    assert res.status_code == 404

    res = client.post(f"/washes/{wash_a.id}/services", headers=auth_headers(owner_b), json={
        "name": "x", "price": 10, "duration_minutes": 10,
    })
    assert res.status_code == 404


def test_employee_cannot_checkin_a_booking_at_a_different_wash(client, db):
    owner_a = make_user(db, "0101000310", role=UserRole.owner)
    wash_a = make_wash(db, owner_a.id)
    owner_b = make_user(db, "0101000311", role=UserRole.owner)
    wash_b = make_wash(db, owner_b.id)
    employee_at_b = make_user(db, "0101000312", role=UserRole.employee, wash_id=wash_b.id)
    customer = make_user(db, "0101000313")

    from datetime import datetime, timedelta, timezone
    res = client.post("/bookings/", headers=auth_headers(customer), json={
        "wash_id": wash_a.id,
        "appointment_time": (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat(),
    })
    booking = res.json()

    res = client.post(f"/bookings/{booking['id']}/checkin", headers=auth_headers(employee_at_b),
                       json={"access_code": booking["access_code"]})
    assert res.status_code == 403


def test_employee_specializations_endpoints_require_owner(client, db):
    owner = make_user(db, "0101000314", role=UserRole.owner)
    wash = make_wash(db, owner.id)
    employee = make_user(db, "0101000315", role=UserRole.employee, wash_id=wash.id)

    # the employee can't grant themself a specialization
    res = client.post(f"/employees/{employee.id}/specializations", headers=auth_headers(employee), json={"service_id": 1})
    assert res.status_code == 403

    # a customer can't either
    customer = make_user(db, "0101000316")
    res = client.post(f"/employees/{employee.id}/specializations", headers=auth_headers(customer), json={"service_id": 1})
    assert res.status_code == 403
