from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, UserProfile
from ..schemas import RecommendationQuery
from ..auth import get_current_user
from ..recommendation_engine import get_personalized_recommendations

router = APIRouter(prefix="/api/v1/recommendations", tags=["Product Recommendations"])

@router.get("")
def get_recommendations(
    skin_type: Optional[str] = Query(None),
    max_budget: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if max_budget is not None and max_budget < 0:
        raise HTTPException(status_code=400, detail="max_budget must be a positive number")

    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    # Resolve skin type: query param > profile > safe "Normal" fallback (never None)
    resolved_skin_type = (
        skin_type
        or (profile.skin_type if profile and profile.skin_type else None)
        or "Normal"
    )

    concerns = (profile.concerns if profile and profile.concerns else []) or []
    allergies = (profile.allergies if profile and profile.allergies else []) or []

    # Flag whether this is genuinely personalised or a safe default
    is_personalized = bool(profile and profile.skin_type)

    recommendations = get_personalized_recommendations(
        skin_type=resolved_skin_type,
        concerns=concerns,
        user_allergies=allergies,
        max_budget=max_budget
    )

    return {
        "user_id": current_user.id,
        "evaluated_skin_type": resolved_skin_type,
        "is_personalized": is_personalized,
        "recommendations_count": len(recommendations),
        "products": recommendations
    }

@router.post("")
def query_recommendations(req: RecommendationQuery):
    if req.max_budget is not None and req.max_budget < 0:
        raise HTTPException(status_code=400, detail="max_budget must be a positive number")

    recommendations = get_personalized_recommendations(
        skin_type=req.skin_type or "Normal",
        concerns=req.concerns or [],
        user_allergies=req.allergies or [],
        max_budget=req.max_budget
    )
    return {"recommendations_count": len(recommendations), "products": recommendations}


