from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db, get_routine_logs
from ..models import User, UserProfile, SkinAssessment, SkincareRoutine, ProgressPhoto
from ..schemas import PrescribeRoutineRequest
from ..auth import get_current_user

router = APIRouter(prefix="/api/v1/consultant", tags=["Consultant & Dermatologist Portal"])

def verify_medical_role(user: User):
    if user.role not in ["Skincare Consultant", "Dermatologist", "Administrator"]:
        raise HTTPException(status_code=403, detail="Access forbidden: Medical professional role required")

@router.get("/roster")
def get_patient_roster(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_medical_role(current_user)

    users = db.query(User).filter(User.role == "User").all()
    roster = []

    for u in users:
        profile = db.query(UserProfile).filter(UserProfile.user_id == u.id).first()
        latest_assessment = db.query(SkinAssessment).filter(SkinAssessment.user_id == u.id).order_by(SkinAssessment.created_at.desc()).first()
        logs = get_routine_logs(u.id)
        
        score = latest_assessment.overall_score if latest_assessment else 82.0
        concerns = latest_assessment.detected_concerns if latest_assessment else ["Acne", "Pigmentation"]
        st = profile.skin_type if profile else "Combination"

        roster.append({
            "patient_id": u.id,
            "name": u.name,
            "email": u.email,
            "skin_type": st,
            "primary_concern": concerns[0] if concerns else "General Maintenance",
            "health_score": score,
            "compliance_rate": 88.0 if not logs else round(min(100.0, (sum(len(l.get('completed_steps', [])) for l in logs) / (len(logs) * 4)) * 100.0), 1),
            "last_assessment_date": latest_assessment.created_at.strftime("%Y-%m-%d") if latest_assessment else "2026-08-01"
        })

    return {"roster_count": len(roster), "patients": roster}

@router.get("/patient/{patient_id}")
def inspect_patient(patient_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_medical_role(current_user)

    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    profile = db.query(UserProfile).filter(UserProfile.user_id == patient_id).first()
    assessments = db.query(SkinAssessment).filter(SkinAssessment.user_id == patient_id).order_by(SkinAssessment.created_at.desc()).all()
    routines = db.query(SkincareRoutine).filter(SkincareRoutine.user_id == patient_id, SkincareRoutine.is_active == True).all()
    photos = db.query(ProgressPhoto).filter(ProgressPhoto.user_id == patient_id).order_by(ProgressPhoto.uploaded_at.asc()).all()

    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "email": patient.email,
            "profile": {
                "skin_type": profile.skin_type if profile else "Oily",
                "allergies": profile.allergies if profile else [],
                "sleep_hours": profile.sleep_hours if profile else 7.5,
                "water_intake_l": profile.water_intake_l if profile else 2.5
            }
        },
        "assessments": [
            {
                "id": a.id,
                "overall_score": a.overall_score,
                "subscores": {
                    "condition": a.condition_subscore,
                    "lifestyle": a.lifestyle_subscore,
                    "sleep": a.sleep_subscore,
                    "consistency": a.consistency_subscore,
                    "hydration": a.hydration_subscore
                },
                "concerns": a.detected_concerns,
                "date": a.created_at.strftime("%Y-%m-%d")
            } for a in assessments
        ],
        "active_routine": [
            {
                "id": r.id,
                "time_of_day": r.time_of_day,
                "step_number": r.step_number,
                "step_category": r.step_category,
                "product_name": r.product_name,
                "active_ingredients": r.active_ingredients,
                "prescribed_by_doctor": r.prescribed_by_doctor,
                "doctor_notes": r.doctor_notes
            } for r in routines
        ],
        "progress_photos": [
            {
                "id": p.id,
                "url": p.image_url,
                "tag": p.tag,
                "score": p.skin_health_score,
                "date": p.uploaded_at.strftime("%Y-%m-%d")
            } for p in photos
        ]
    }

@router.post("/prescribe")
def prescribe_routine_overwrite(
    req: PrescribeRoutineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_medical_role(current_user)

    patient = db.query(User).filter(User.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient user not found")

    # Deactivate current steps
    db.query(SkincareRoutine).filter(SkincareRoutine.user_id == req.patient_id).update({"is_active": False})

    # Save doctor prescribed routine
    for step in req.routine_steps:
        routine = SkincareRoutine(
            user_id=req.patient_id,
            time_of_day=step.time_of_day,
            step_number=step.step_number,
            step_category=step.step_category,
            product_name=step.product_name,
            active_ingredients=step.active_ingredients,
            is_active=True,
            prescribed_by_doctor=True,
            doctor_notes=req.doctor_notes
        )
        db.add(routine)

    db.commit()
    return {"status": "success", "message": "Patient routine overwritten successfully by doctor", "doctor_notes": req.doctor_notes}
