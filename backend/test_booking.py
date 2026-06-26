import requests

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImN1c3RvbWVyIiwicGhvbmUiOiIwMTAxMjM0NTY3OCIsImV4cCI6MTc4MTczODkzOH0.7joFtQqSSukWO7NfWWMshMXoxB6x7fYRR8HS-cxbr_0"

response = requests.post(
    "http://127.0.0.1:8000/bookings/",
    headers={"Authorization": f"Bearer {token}"},
    json={"wash_id": 1, "appointment_time": "2026-01-01T14:00:00"}
)

print(response.status_code)
print(response.json())