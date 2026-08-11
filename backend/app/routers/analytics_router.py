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
        clean_url.startswith("data:image/") or
        clean_url.startswith("/")
    )
    if not valid_scheme:
        raise HTTPException(
            status_code=400,
            detail="Invalid image_url format. Allowed schemes: http://, https://, data:image/, /"
        )

    latest_assessment = db.query(SkinAssessment).filter(SkinAssessment.user_id == current_user.id).order_by(SkinAssessment.created_at.desc()).first()
    score = latest_assessment.overall_score if latest_assessment else None

    photo = ProgressPhoto(
        user_id=current_user.id,
        image_url=clean_url,
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
        "uploaded_at": photo.uploaded_at.isoformat() if photo.uploaded_at else None
    }

@router.delete("/photos/{photo_id}")
def delete_progress_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a progress photo by ID with strict ownership validation."""
    photo = db.query(ProgressPhoto).filter(ProgressPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Progress photo not found")
    if photo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access forbidden: You do not own this photo")

    db.delete(photo)
    db.commit()
    return {"status": "deleted", "id": photo_id}


@router.get("")
def get_user_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Fetch assessments trajectory
    assessments = db.query(SkinAssessment).filter(SkinAssessment.user_id == current_user.id).order_by(SkinAssessment.created_at.asc()).all()
    score_history = [{"date": a.created_at.strftime("%Y-%m-%d"), "score": a.overall_score} for a in assessments]

    # 2. Fetch photos
    photos = db.query(ProgressPhoto).filter(ProgressPhoto.user_id == current_user.id).order_by(ProgressPhoto.uploaded_at.asc()).all()
    photo_gallery = [{"id": p.id, "url": p.image_url, "tag": p.tag, "score": p.skin_health_score, "date": p.uploaded_at.strftime("%Y-%m-%d")} for p in photos]

    # 3. Calculate rolling compliance per time window
    logs = get_routine_logs(current_user.id)
    # Sort logs by log_date descending so index-slicing gives the most recent N logs
    sorted_logs = sorted(logs, key=lambda l: l.get("log_date", ""), reverse=True)

    def _window_adherence(window_logs: list) -> float:
        """Compute adherence % for a specific set of logs (each log = 1 day, 4 routine steps)."""
        if not window_logs:
            return 0.0
        steps = sum(len(l.get("completed_steps", [])) for l in window_logs)
        return round(min(100.0, (steps / (len(window_logs) * 4)) * 100.0), 1)

    adherence_rate_7d = _window_adherence(sorted_logs[:7])
    adherence_rate_30d = _window_adherence(sorted_logs[:30])
    adherence_rate_90d = _window_adherence(sorted_logs[:90])


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
