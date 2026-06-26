from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base

class EmployeeSpecialization(Base):
    __tablename__ = "employee_specializations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
