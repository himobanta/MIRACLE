from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db, get_routine_logs
from ..models import User, UserProfile, SkinAssessment
from ..schemas import AssessmentRequest, AssessmentResponse
from ..auth import get_current_user
from ..scoring_engine import calculate_skin_health_score
from ..routine_generator import generate_customized_routine
from ..models import SkincareRoutine

router = APIRouter(prefix="/api/v1/assessment", tags=["Assessment"])

@router.post("/evaluate", response_model=AssessmentResponse)
def evaluate_skin(req: AssessmentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Calculate adherence rate from MongoDB/JSON logs
    logs = get_routine_logs(current_user.id)
    if logs:
        total_steps = sum(len(l.get("completed_steps", [])) for l in logs)
        adherence_pct = min(100.0, (total_steps / (len(logs) * 4)) * 100.0) if logs else 100.0
    else:
        adherence_pct = 100.0

    concerns_severity = {
        "acne_severity": req.acne_severity,
        "hyperpigmentation_severity": req.hyperpigmentation_severity,
        "redness_severity": req.redness_severity,
        "wrinkles_severity": req.wrinkles_severity,
    }

    lifestyle = req.lifestyle or {}
    sleep = lifestyle.get("sleep_hours", 7.5)
    water = lifestyle.get("water_intake_liters", 2.5)

    overall, subscores, detected = calculate_skin_health_score(
        concerns_severity=concerns_severity,
        lifestyle=lifestyle,
        sleep_hours=sleep,
        water_intake_l=water,
        adherence_pct=adherence_pct
    )

    # Save snapshot in skin_assessments table
    assessment = SkinAssessment(
        user_id=current_user.id,
        overall_score=overall,
        condition_subscore=subscores["condition"],
        lifestyle_subscore=subscores["lifestyle"],
        sleep_subscore=subscores["sleep"],
        consistency_subscore=subscores["consistency"],
        hydration_subscore=subscores["hydration"],
        detected_concerns=detected
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    # Save UserProfile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    profile.skin_type = req.skin_type
    profile.allergies = req.allergies
    profile.concerns = detected
    profile.sleep_hours = sleep
    profile.water_intake_l = water
    db.commit()

    # Generate & Save Personalized Skincare Routine
    new_steps = generate_customized_routine(req.skin_type, concerns_severity)
    
    # Deactivate previous steps
    db.query(SkincareRoutine).filter(SkincareRoutine.user_id == current_user.id).update({"is_active": False})
    
    for s in new_steps:
        routine_entry = SkincareRoutine(
            user_id=current_user.id,
            assessment_id=assessment.id,
            time_of_day=s["time_of_day"],
            step_number=s["step_number"],
            step_category=s["step_category"],
            product_name=s["product_name"],
            active_ingredients=s["active_ingredients"],
            is_active=True
        )
        db.add(routine_entry)
    db.commit()

    return AssessmentResponse(
        id=assessment.id,
        overall_score=assessment.overall_score,
        condition_subscore=assessment.condition_subscore,
        lifestyle_subscore=assessment.lifestyle_subscore,
        sleep_subscore=assessment.sleep_subscore,
        consistency_subscore=assessment.consistency_subscore,
        hydration_subscore=assessment.hydration_subscore,
        detected_concerns=assessment.detected_concerns,
        created_at=assessment.created_at.isoformat()
    )

@router.get("/score", response_model=AssessmentResponse)
def get_latest_score(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    latest = db.query(SkinAssessment).filter(SkinAssessment.user_id == current_user.id).order_by(SkinAssessment.created_at.desc()).first()
    if not latest:
        raise HTTPException(status_code=404, detail="No skin assessment record found for this user")
    return AssessmentResponse(
        id=latest.id,
        overall_score=latest.overall_score,
        condition_subscore=latest.condition_subscore,
        lifestyle_subscore=latest.lifestyle_subscore,
        sleep_subscore=latest.sleep_subscore,
        consistency_subscore=latest.consistency_subscore,
        hydration_subscore=latest.hydration_subscore,
        detected_concerns=latest.detected_concerns,
        created_at=latest.created_at.isoformat()
    )

@router.get("/profile")
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        return {"skin_type": None, "concerns": [], "allergies": [], "sleep_hours": 7.5, "water_intake_l": 2.5, "stress_level": 4, "sun_exposure": "Moderate", "age": None, "gender": None}
    return {
        "skin_type": profile.skin_type,
        "concerns": profile.concerns or [],
        "allergies": profile.allergies or [],
        "sensitivities": profile.sensitivities,
        "sleep_hours": profile.sleep_hours,
        "water_intake_l": profile.water_intake_l,
        "stress_level": profile.stress_level,
        "sun_exposure": profile.sun_exposure,
        "age": profile.age,
        "gender": profile.gender
    }

@router.post("/profile")
def update_profile(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from fastapi import Body
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    if "skin_type" in data: profile.skin_type = data["skin_type"]
    if "concerns" in data: profile.concerns = data["concerns"]
    if "allergies" in data: profile.allergies = data["allergies"]
    if "sleep_hours" in data: profile.sleep_hours = float(data["sleep_hours"])
    if "water_intake_l" in data: profile.water_intake_l = float(data["water_intake_l"])
    if "stress_level" in data: profile.stress_level = int(data["stress_level"])
    if "sun_exposure" in data: profile.sun_exposure = data["sun_exposure"]
    if "age" in data: profile.age = data.get("age")
    if "gender" in data: profile.gender = data.get("gender")

    db.commit()
    return {"status": "updated", "skin_type": profile.skin_type, "concerns": profile.concerns}

@router.get("/skin-types")
def get_skin_types_dataset():
    import json, os
    p = os.path.join(os.path.dirname(__file__), "..", "seed_data", "skin_types.json")
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@router.get("/skin-concerns")
def get_skin_concerns_dataset():
    import json, os
    p = os.path.join(os.path.dirname(__file__), "..", "seed_data", "skin_concerns.json")
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

