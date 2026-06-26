from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.employee_specialization import EmployeeSpecialization
from app.models.user import User
from app.models.wash import Wash
from app.schemas.employee_specialization import SpecializationCreate, SpecializationResponse
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/employees", tags=["Employee Specializations"])


def _assert_owns_employee(db: Session, current_user: dict, employee_id: int) -> User:
    if current_user.get("role") not in ["owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    if current_user.get("role") == "owner":
        owner_id = int(current_user["sub"])
        wash = db.query(Wash).filter(Wash.owner_id == owner_id).first()
        if not wash or employee.wash_id != wash.id:
            raise HTTPException(status_code=403, detail="الموظف غير تابع لمغسلتك")
    return employee


@router.get("/{employee_id}/specializations", response_model=List[SpecializationResponse])
def list_specializations(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(EmployeeSpecialization).filter(
        EmployeeSpecialization.employee_id == employee_id
    ).all()


@router.post("/{employee_id}/specializations", response_model=SpecializationResponse)
def add_specialization(
    employee_id: int,
    data: SpecializationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _assert_owns_employee(db, current_user, employee_id)
    existing = db.query(EmployeeSpecialization).filter(
        EmployeeSpecialization.employee_id == employee_id,
        EmployeeSpecialization.service_id == data.service_id,
    ).first()
    if existing:
        return existing
    spec = EmployeeSpecialization(employee_id=employee_id, service_id=data.service_id)
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return spec


@router.delete("/{employee_id}/specializations/{service_id}")
def remove_specialization(
    employee_id: int,
    service_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _assert_owns_employee(db, current_user, employee_id)
    spec = db.query(EmployeeSpecialization).filter(
        EmployeeSpecialization.employee_id == employee_id,
        EmployeeSpecialization.service_id == service_id,
    ).first()
    if not spec:
        raise HTTPException(status_code=404, detail="التخصص غير موجود")
    db.delete(spec)
    db.commit()
    return {"message": "تم الحذف"}
