from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from ..database import get_db
from ..models import User, Appointment, UserProfile, SkinAssessment, ProgressPhoto
from ..schemas import RoutineStepSchema
from ..auth import get_current_user

router = APIRouter(prefix="/api/v1/appointments", tags=["Appointments & Consultations"])

PRO_PROFILES = [
    {
        "id": "cons_1",
        "name": "Dr. Priya Sharma",
        "role": "Skincare Consultant",
        "title": "Senior Clinical Skincare Specialist",
        "specialty": "Acne Barrier Repair & Botanical Science",
        "experience": "8+ Years Experience",
        "rating": 4.9,
        "reviews": 320,
        "bio": "Specializes in holistic skin health analysis, barrier repair protocols, and AI-guided custom routine composition.",
        "avatar": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=140&h=140&fit=crop&crop=faces&auto=format&q=80",
        "availability": ["Monday", "Wednesday", "Friday"],
        "location": "Mumbai Dermatology Centre & Online"
    },
    {
        "id": "derma_1",
        "name": "Dr. Meera Iyer",
        "role": "Dermatologist",
        "title": "MD Dermatology, Board Certified Specialist",
        "specialty": "Severe Acne, Hyperpigmentation & Clinical Actives",
        "experience": "14+ Years Experience",
        "rating": 5.0,
        "reviews": 580,
        "bio": "Board-certified dermatologist focusing on prescription active management, complex skin conditions, and clinical ingredient safety.",
        "avatar": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=140&h=140&fit=crop&crop=faces&auto=format&q=80",
        "availability": ["Tuesday", "Thursday", "Saturday"],
        "location": "Miracle Medical Skin Institute"
    }
]

@router.get("/professionals")
def list_professionals():
    return {"professionals": PRO_PROFILES}

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
    appts = db.query(Appointment).filter(Appointment.user_id == current_user.id).order_by(Appointment.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "target_role": a.target_role,
            "preferred_date": a.preferred_date,
            "preferred_time": a.preferred_time,
            "status": a.status,
            "user_notes": a.user_notes,
            "consultant_summary": a.consultant_summary,
            "doctor_notes": a.doctor_notes,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M")
        } for a in appts
    ]

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
