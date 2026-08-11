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
        
        score = latest_assessment.overall_score if latest_assessment else None
        concerns = latest_assessment.detected_concerns if latest_assessment else (profile.concerns if profile and profile.concerns else [])
        st = profile.skin_type if (profile and profile.skin_type) else "Unassessed"

        roster.append({
            "patient_id": u.id,
            "name": u.name,
            "email": u.email,
            "skin_type": st,
            "primary_concern": concerns[0] if concerns else "General Maintenance",
            "health_score": score,
            "compliance_rate": 0.0 if not logs else round(min(100.0, (sum(len(l.get('completed_steps', [])) for l in logs) / (len(logs) * 4)) * 100.0), 1),
            "last_assessment_date": latest_assessment.created_at.strftime("%Y-%m-%d") if (latest_assessment and latest_assessment.created_at) else None
        })

    return {"roster_count": len(roster), "patients": roster}

@router.get("/stats")
def get_platform_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_medical_role(current_user)

    from ..models import Appointment
    total_users = db.query(User).count()
    users_by_role = {
        "User": db.query(User).filter(User.role == "User").count(),
        "Skincare Consultant": db.query(User).filter(User.role == "Skincare Consultant").count(),
        "Dermatologist": db.query(User).filter(User.role == "Dermatologist").count(),
        "Administrator": db.query(User).filter(User.role == "Administrator").count(),
    }
    total_assessments = db.query(SkinAssessment).count()
    total_routines = db.query(SkincareRoutine).filter(SkincareRoutine.is_active == True).count()
    total_appointments = db.query(Appointment).count()

    return {
        "total_users": total_users,
        "users_by_role": users_by_role,
        "total_assessments": total_assessments,
        "active_routines": total_routines,
        "total_appointments": total_appointments,
    }

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
                "skin_type": profile.skin_type if (profile and profile.skin_type) else "Unassessed",
                "age": profile.age if (profile and profile.age is not None) else None,
                "gender": profile.gender if (profile and profile.gender) else None,
                "allergies": profile.allergies if (profile and profile.allergies) else [],
                "sleep_hours": profile.sleep_hours if (profile and profile.sleep_hours is not None) else None,
                "water_intake_l": profile.water_intake_l if (profile and profile.water_intake_l is not None) else None

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
                "date": a.created_at.strftime("%Y-%m-%d") if a.created_at else None
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
                "date": p.uploaded_at.strftime("%Y-%m-%d") if p.uploaded_at else None
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

    try:
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
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save prescribed routine; no changes were applied")

    return {"status": "success", "message": "Patient routine overwritten successfully by doctor", "doctor_notes": req.doctor_notes}
