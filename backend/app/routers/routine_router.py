from datetime import date
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from ..database import get_db, save_routine_log, get_routine_logs
from ..models import User, SkincareRoutine
from ..schemas import RoutineStepSchema
from ..auth import get_current_user

router = APIRouter(prefix="/api/v1/routine", tags=["Routine"])

@router.get("", response_model=List[RoutineStepSchema])
@router.post("/generate", response_model=List[RoutineStepSchema])
def get_user_routine(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    routines = db.query(SkincareRoutine).filter(
        SkincareRoutine.user_id == current_user.id,
        SkincareRoutine.is_active == True
    ).order_by(SkincareRoutine.step_number.asc()).all()

    return [
        RoutineStepSchema(
            id=r.id,
            time_of_day=r.time_of_day,
            step_number=r.step_number,
            step_category=r.step_category,
            product_name=r.product_name,
            active_ingredients=r.active_ingredients,
            is_active=r.is_active,
            prescribed_by_doctor=r.prescribed_by_doctor,
            doctor_notes=r.doctor_notes
        ) for r in routines
    ]

@router.post("/log")
def log_routine_completion(
    payload: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user)
):
    log_date = payload.get("log_date", str(date.today()))
    completed_steps = payload.get("completed_steps", [])
    water_intake_ml = payload.get("water_intake_ml", 2500)
    sleep_hours = payload.get("sleep_hours", 7.5)

    log_entry = {
        "user_id": current_user.id,
        "log_date": log_date,
        "completed_steps": completed_steps,
        "water_intake_ml": water_intake_ml,
        "sleep_hours": sleep_hours
    }

    save_routine_log(log_entry)
    return {"status": "success", "message": "Routine progress logged successfully", "log": log_entry}

@router.get("/logs")
def get_user_routine_logs(current_user: User = Depends(get_current_user)):
    logs = get_routine_logs(current_user.id)
    return {"user_id": current_user.id, "logs": logs}
