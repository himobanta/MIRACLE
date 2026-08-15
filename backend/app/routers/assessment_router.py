from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db, get_routine_logs
from ..models import User, UserProfile, SkinAssessment, SkincareRoutine
from ..schemas import AssessmentRequest, AssessmentResponse
from ..auth import get_current_user
from ..scoring_engine import calculate_skin_health_score
from ..routine_generator import generate_customized_routine

router = APIRouter(prefix="/api/v1/assessment", tags=["Assessment"])

VALID_SKIN_TYPES = {"Normal", "Oily", "Dry", "Sensitive", "Combination"}

@router.post("/evaluate", response_model=AssessmentResponse)
@router.post("/submit", response_model=AssessmentResponse)
def evaluate_skin(req: AssessmentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Validate skin_type
    clean_skin_type = (req.skin_type or "").strip()
    if clean_skin_type not in VALID_SKIN_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid skin_type '{req.skin_type}'. Allowed values: {sorted(list(VALID_SKIN_TYPES))}"
        )

    # Validate concern severities (must be 0-10)
    for field_name, val in [
        ("acne_severity", req.acne_severity),
        ("hyperpigmentation_severity", req.hyperpigmentation_severity),
        ("redness_severity", req.redness_severity),
        ("wrinkles_severity", req.wrinkles_severity),
    ]:
        if val < 0 or val > 10:
            raise HTTPException(
                status_code=400,
                detail=f"{field_name} must be an integer between 0 and 10"
            )

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
    sleep = lifestyle.get("sleep_hours")
    water = lifestyle.get("water_intake") or lifestyle.get("water_intake_liters") or lifestyle.get("water_intake_l")
    # Use defaults only for scoring calculation, not for persistence
    sleep_for_scoring = sleep if sleep is not None else 7.5
    water_for_scoring = water if water is not None else 2.5

    overall, subscores, detected = calculate_skin_health_score(
        concerns_severity=concerns_severity,
        lifestyle=lifestyle,
        sleep_hours=sleep_for_scoring,
        water_intake_l=water_for_scoring,
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
    db.flush()  # flush to get assessment.id without committing yet

    # Save UserProfile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    profile.skin_type = clean_skin_type
    profile.allergies = req.allergies
    profile.concerns = detected
    profile.sleep_hours = sleep  # persists actual value or None
    profile.water_intake_l = water  # persists actual value or None
    # Generate & Save Personalized Skincare Routine
    new_steps = generate_customized_routine(clean_skin_type, concerns_severity)

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

    # Single atomic commit: assessment + profile + routine all succeed or all roll back
    db.commit()
    db.refresh(assessment)

    return AssessmentResponse(
        id=assessment.id,
        overall_score=assessment.overall_score,
        condition_subscore=assessment.condition_subscore,
        lifestyle_subscore=assessment.lifestyle_subscore,
        sleep_subscore=assessment.sleep_subscore,
        consistency_subscore=assessment.consistency_subscore,
        hydration_subscore=assessment.hydration_subscore,
        detected_concerns=assessment.detected_concerns,
        created_at=assessment.created_at.isoformat() if assessment.created_at else None
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
        created_at=latest.created_at.isoformat() if latest.created_at else None
    )

@router.get("/history", response_model=List[AssessmentResponse])
def get_assessment_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieve full assessment history for current authenticated user, ordered by date descending."""
    assessments = db.query(SkinAssessment).filter(SkinAssessment.user_id == current_user.id).order_by(SkinAssessment.created_at.desc()).all()
    return [
        AssessmentResponse(
            id=a.id,
            overall_score=a.overall_score,
            condition_subscore=a.condition_subscore,
            lifestyle_subscore=a.lifestyle_subscore,
            sleep_subscore=a.sleep_subscore,
            consistency_subscore=a.consistency_subscore,
            hydration_subscore=a.hydration_subscore,
            detected_concerns=a.detected_concerns,
            created_at=a.created_at.isoformat() if a.created_at else None
        )
        for a in assessments
    ]

@router.get("/profile")
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return {
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
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
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    try:
        if "name" in data and data["name"]:
            new_name = str(data["name"]).strip()
            if new_name:
                current_user.name = new_name
        if "skin_type" in data:
            st = (data["skin_type"] or "").strip()
            if st and st not in VALID_SKIN_TYPES:
                raise HTTPException(status_code=400, detail=f"Invalid skin_type '{st}'. Allowed values: {sorted(list(VALID_SKIN_TYPES))}")
            profile.skin_type = st or None
        if "concerns" in data: profile.concerns = data["concerns"]
        if "allergies" in data: profile.allergies = data["allergies"]
        if "sleep_hours" in data and data["sleep_hours"] is not None:
            val_sh = float(data["sleep_hours"])
            if val_sh < 0.0 or val_sh > 24.0:
                raise HTTPException(status_code=400, detail="sleep_hours must be between 0.0 and 24.0")
            profile.sleep_hours = val_sh
        if "water_intake_l" in data and data["water_intake_l"] is not None:
            val_wi = float(data["water_intake_l"])
            if val_wi < 0.0 or val_wi > 20.0:
                raise HTTPException(status_code=400, detail="water_intake_l must be between 0.0 and 20.0")
            profile.water_intake_l = val_wi
        if "stress_level" in data and data["stress_level"] is not None:
            val_sl = int(data["stress_level"])
            if val_sl < 0 or val_sl > 10:
                raise HTTPException(status_code=400, detail="stress_level must be between 0 and 10")
            profile.stress_level = val_sl
        if "sun_exposure" in data: profile.sun_exposure = data["sun_exposure"]
        if "age" in data and data["age"] is not None:
            val_ag = int(data["age"])
            if val_ag < 0 or val_ag > 120:
                raise HTTPException(status_code=400, detail="age must be between 0 and 120")
            profile.age = val_ag
        if "gender" in data: profile.gender = data.get("gender")
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid numeric data format: {str(e)}")

    db.commit()
    return {"status": "updated", "name": current_user.name, "skin_type": profile.skin_type, "concerns": profile.concerns}

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

@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment_by_id(assessment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieve a specific assessment by ID with strict user ownership verification."""
    assessment = db.query(SkinAssessment).filter(SkinAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access forbidden: You do not own this assessment")
    return AssessmentResponse(
        id=assessment.id,
        overall_score=assessment.overall_score,
        condition_subscore=assessment.condition_subscore,
        lifestyle_subscore=assessment.lifestyle_subscore,
        sleep_subscore=assessment.sleep_subscore,
        consistency_subscore=assessment.consistency_subscore,
        hydration_subscore=assessment.hydration_subscore,
        detected_concerns=assessment.detected_concerns,
        created_at=assessment.created_at.isoformat() if assessment.created_at else None
    )



