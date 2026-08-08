from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from ..database import get_db, get_routine_logs
from ..models import User, ProgressPhoto, SkinAssessment
from ..auth import get_current_user

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics & Progress Tracking"])

@router.post("/photos/upload")
def upload_progress_photo(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    image_url = payload.get("image_url")
    tag = payload.get("tag", "Baseline")
    
    if not image_url or not isinstance(image_url, str) or not image_url.strip():
        raise HTTPException(status_code=400, detail="image_url is required and must be a non-empty string")

    clean_url = image_url.strip()
    valid_scheme = (
        clean_url.startswith("http://") or
        clean_url.startswith("https://") or
        clean_url.startswith("data:image/")
    )
    if not valid_scheme:
        raise HTTPException(
            status_code=400,
            detail="Invalid image_url format. Allowed schemes: http://, https://, data:image/"
        )

    latest_assessment = db.query(SkinAssessment).filter(SkinAssessment.user_id == current_user.id).order_by(SkinAssessment.created_at.desc()).first()
    score = latest_assessment.overall_score if latest_assessment else 75.0

    photo = ProgressPhoto(
        user_id=current_user.id,
        image_url=image_url,
        skin_health_score=score,
        tag=tag
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {
        "id": photo.id,
        "image_url": photo.image_url,
        "tag": photo.tag,
        "skin_health_score": photo.skin_health_score,
        "uploaded_at": photo.uploaded_at.isoformat()
    }

@router.get("")
def get_user_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Fetch assessments trajectory
    assessments = db.query(SkinAssessment).filter(SkinAssessment.user_id == current_user.id).order_by(SkinAssessment.created_at.asc()).all()
    score_history = [{"date": a.created_at.strftime("%Y-%m-%d"), "score": a.overall_score} for a in assessments]

    # 2. Fetch photos
    photos = db.query(ProgressPhoto).filter(ProgressPhoto.user_id == current_user.id).order_by(ProgressPhoto.uploaded_at.asc()).all()
    photo_gallery = [{"id": p.id, "url": p.image_url, "tag": p.tag, "score": p.skin_health_score, "date": p.uploaded_at.strftime("%Y-%m-%d")} for p in photos]

    # 3. Calculate rolling compliance
    logs = get_routine_logs(current_user.id)
    total_logs = len(logs)
    if total_logs > 0:
        total_steps = sum(len(l.get("completed_steps", [])) for l in logs)
        adherence_rate_7d = round(min(100.0, (total_steps / (min(7, total_logs) * 4)) * 100.0), 1)
        adherence_rate_30d = round(min(100.0, (total_steps / (min(30, total_logs) * 4)) * 100.0), 1)
        adherence_rate_90d = round(min(100.0, (total_steps / (min(90, total_logs) * 4)) * 100.0), 1)
    else:
        adherence_rate_7d = 85.0
        adherence_rate_30d = 80.0
        adherence_rate_90d = 82.0

    return {
        "user_id": current_user.id,
        "compliance_metrics": {
            "adherence_7d": adherence_rate_7d,
            "adherence_30d": adherence_rate_30d,
            "adherence_90d": adherence_rate_90d
        },
        "score_history": score_history,
        "progress_photos": photo_gallery
    }
