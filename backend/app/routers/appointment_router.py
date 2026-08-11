from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from ..database import get_db
from ..models import User, Appointment, UserProfile, SkinAssessment, ProgressPhoto
from ..schemas import RoutineStepSchema
from ..auth import get_current_user

router = APIRouter(prefix="/api/v1/appointments", tags=["Appointments & Consultations"])


@router.get("/professionals")
def list_professionals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all registered professionals (Skincare Consultants and Dermatologists)
    from the database. Sourced from real DB records — no hardcoded data.
    Only safe profile fields are returned (no password hashes or sensitive internals).
    """
    professionals = db.query(User).filter(
        User.role.in_(["Skincare Consultant", "Dermatologist"])
    ).order_by(User.role, User.name).all()

    return {
        "professionals": [
            {
                "id": p.id,
                "name": p.name,
                "role": p.role,
                "email": p.email,
                "registered_since": p.created_at.strftime("%Y-%m-%d") if p.created_at else None,
            }
            for p in professionals
        ]
    }

@router.post("/request")
def request_appointment(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_role = payload.get("target_role", "Consultant")
    preferred_date = payload.get("preferred_date", "2026-08-15")
    preferred_time = payload.get("preferred_time", "10:30 AM")
    user_notes = payload.get("user_notes", "")

    appt = Appointment(
        user_id=current_user.id,
        target_role=target_role,
        preferred_date=preferred_date,
        preferred_time=preferred_time,
        status="Requested",
        user_notes=user_notes
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    return {
        "id": appt.id,
        "status": appt.status,
        "target_role": appt.target_role,
        "preferred_date": appt.preferred_date,
        "preferred_time": appt.preferred_time,
        "message": "Appointment request submitted successfully"
    }

@router.get("/my")
def get_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role in ["Skincare Consultant", "Dermatologist", "Administrator"]:
        appts = db.query(Appointment).order_by(Appointment.created_at.desc()).all()
    else:
        appts = db.query(Appointment).filter(Appointment.user_id == current_user.id).order_by(Appointment.created_at.desc()).all()

    result = []
    for a in appts:
        user = db.query(User).filter(User.id == a.user_id).first()
        result.append({
            "id": a.id,
            "patient_id": a.user_id,
            "patient_name": user.name if user else "Patient",
            "patient_email": user.email if user else "",
            "target_role": a.target_role,
            "preferred_date": a.preferred_date,
            "preferred_time": a.preferred_time,
            "status": a.status,
            "user_notes": a.user_notes,
            "consultant_summary": a.consultant_summary,
            "doctor_notes": a.doctor_notes,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else None
        })
    return result

VALID_STATUSES = {"Requested", "Accepted", "Rejected", "Referred_To_Dermatologist", "Completed"}

@router.post("/{appointment_id}/status")
def update_appointment_status(
    appointment_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["Skincare Consultant", "Dermatologist", "Administrator"]:
        raise HTTPException(status_code=403, detail="Access forbidden: Medical professional role required to update appointment status")

    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    new_status = payload.get("status", "Accepted")
    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status '{new_status}'. Allowed statuses: {sorted(list(VALID_STATUSES))}")

    notes = payload.get("notes", "")

    appt.status = new_status
    if current_user.role == "Skincare Consultant":
        appt.consultant_summary = notes
        appt.consultant_id = current_user.id
    elif current_user.role == "Dermatologist":
        appt.doctor_notes = notes
        appt.dermatologist_id = current_user.id

    db.commit()
    return {"status": appt.status, "message": f"Appointment status updated to {new_status}"}

@router.post("/{appointment_id}/refer")
def refer_to_dermatologist(
    appointment_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["Skincare Consultant", "Administrator"]:
        raise HTTPException(status_code=403, detail="Only consultants can initiate dermatologist referrals")

    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    consultant_summary = payload.get("consultant_summary", "Patient requires specialist dermatologist evaluation for active treatment scaling.")
    preferred_date = payload.get("preferred_date", appt.preferred_date)
    preferred_time = payload.get("preferred_time", appt.preferred_time)

    appt.status = "Referred_To_Dermatologist"
    appt.consultant_summary = consultant_summary
    appt.preferred_date = preferred_date
    appt.preferred_time = preferred_time
    appt.consultant_id = current_user.id

    db.commit()
    return {"status": appt.status, "message": "Patient successfully referred to Dermatologist", "preferred_date": preferred_date}
