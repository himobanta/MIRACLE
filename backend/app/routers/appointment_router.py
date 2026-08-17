from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from ..database import get_db
from ..models import User, Appointment, UserProfile, SkinAssessment, ProgressPhoto, ConsultantProfile, DermatologistProfile
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
    from the database with rich profile information, qualifications, and specialties.
    """
    professionals = db.query(User).filter(
        User.role.in_(["Skincare Consultant", "Dermatologist"])
    ).order_by(User.role, User.name).all()

    result = []
    for p in professionals:
        item = {
            "id": p.id,
            "name": p.name,
            "role": p.role,
            "target_role": "Consultant" if p.role == "Skincare Consultant" else "Dermatologist",
            "email": p.email,
            "registered_since": p.created_at.strftime("%Y-%m-%d") if p.created_at else None,
            "rating": 4.9,
            "avatar": None,
        }
        if p.role == "Skincare Consultant":
            cp = db.query(ConsultantProfile).filter(ConsultantProfile.user_id == p.id).first()
            if cp:
                item["title"] = cp.title or "Skincare Consultant"
                item["specialty"] = cp.specialization or "Barrier Repair & Botanical Science"
                item["experience"] = f"{cp.experience_years} Years Experience" if cp.experience_years else "8+ Years Experience"
                item["qualifications"] = cp.qualifications or "B.Sc. Cosmetic Science"
                item["availability"] = cp.availability or "Mon-Fri, 9:00 AM - 6:00 PM"
                item["areas_of_expertise"] = cp.areas_of_expertise or ["Acne & Blemish Care", "Barrier Restoration"]
            else:
                item["title"] = "Certified Skincare Consultant"
                item["specialty"] = "Acne & Barrier Repair"
                item["experience"] = "8+ Years Experience"
                item["qualifications"] = "B.Sc. Cosmetic Science & Aesthetics"
                item["availability"] = "Mon-Fri, 9:00 AM - 6:00 PM"
        elif p.role == "Dermatologist":
            dp = db.query(DermatologistProfile).filter(DermatologistProfile.user_id == p.id).first()
            if dp:
                item["title"] = dp.title or "Consultant Dermatologist"
                item["specialty"] = dp.specialization or "Clinical & Procedural Dermatology"
                item["experience"] = f"{dp.experience_years} Years Clinical Practice" if dp.experience_years else "12+ Years Clinical Practice"
                item["qualifications"] = dp.qualifications or "M.D. Dermatology, Venereology & Leprosy"
                item["availability"] = dp.availability or "Mon-Sat, 10:00 AM - 7:00 PM"
                item["areas_of_expertise"] = dp.areas_of_expertise or ["Cystic Acne", "Barrier Repair", "Pigmentary Disorders"]
            else:
                item["title"] = "Senior Dermatologist (M.D.)"
                item["specialty"] = "Clinical Dermatology & Barrier Repair"
                item["experience"] = "12+ Years Experience"
                item["qualifications"] = "M.D. Dermatology (Gold Medalist)"
                item["availability"] = "Mon-Sat, 10:00 AM - 7:00 PM"
        result.append(item)

    return {"professionals": result}

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
