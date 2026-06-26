from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers.auth import router as auth_router
from app.routers.wash import router as wash_router
from app.routers.booking import router as booking_router
from app.routers.admin import router as admin_router
from app.routers.vehicle import router as vehicle_router
from app.routers.leave import router as leave_router
from app.routers.waitlist import router as waitlist_router
from app.routers.service import router as service_router
from app.models import (
    user,
    wash as wash_model,
    booking as booking_model,
    vehicle as vehicle_model,
    leave as leave_model,
    waitlist as waitlist_model,
    service as service_model,
)
from dotenv import load_dotenv

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="washly API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(wash_router)
app.include_router(booking_router)
app.include_router(admin_router)
app.include_router(vehicle_router)
app.include_router(leave_router)
app.include_router(waitlist_router)
app.include_router(service_router)

@app.get("/")
def root():
    return {"message": "washly API is running"}