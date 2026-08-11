from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from ..database import get_db
from ..models import User, UserProfile, SkinAssessment, SkincareRoutine, ProgressPhoto, Appointment
from ..auth import get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["Administrator Portal"])


def verify_admin(user: User):
    if user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Access forbidden: Administrator role required")


@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Full platform statistics for the Admin dashboard.
    All values are derived from the real database — no hardcoded numbers.
    """
    verify_admin(current_user)

    # User counts
    total_users = db.query(User).count()
    users_by_role = {
        "User": db.query(User).filter(User.role == "User").count(),
        "Skincare Consultant": db.query(User).filter(User.role == "Skincare Consultant").count(),
        "Dermatologist": db.query(User).filter(User.role == "Dermatologist").count(),
        "Administrator": db.query(User).filter(User.role == "Administrator").count(),
    }

    # Assessment stats
    total_assessments = db.query(SkinAssessment).count()

    # Collect concern distribution from detected_concerns in assessments
    all_assessments = db.query(SkinAssessment).all()
    concern_counts: Dict[str, int] = {}
    for a in all_assessments:
        for concern in (a.detected_concerns or []):
            # Normalise: strip severity suffix for grouping, e.g. "Acne (Mild: 2/10)" → "Acne"
            key = concern.split(" (")[0].strip()
            concern_counts[key] = concern_counts.get(key, 0) + 1

    # Sort by count desc, return top 6
    sorted_concerns = sorted(concern_counts.items(), key=lambda x: x[1], reverse=True)[:6]
    total_concern_mentions = sum(c[1] for c in sorted_concerns) or 1
    concern_distribution = [
        {
            "label": name,
            "count": count,
            "pct": round((count / total_concern_mentions) * 100)
        }
        for name, count in sorted_concerns
    ]

    # Routine stats
    active_routines = db.query(SkincareRoutine).filter(SkincareRoutine.is_active == True).count()
    doctor_prescribed = db.query(SkincareRoutine).filter(
        SkincareRoutine.is_active == True,
        SkincareRoutine.prescribed_by_doctor == True
    ).count()

    # Progress photo count
    total_photos = db.query(ProgressPhoto).count()

    # Appointment stats
    total_appointments = db.query(Appointment).count()
    appointments_by_status = {
        "Requested": db.query(Appointment).filter(Appointment.status == "Requested").count(),
        "Accepted": db.query(Appointment).filter(Appointment.status == "Accepted").count(),
        "Completed": db.query(Appointment).filter(Appointment.status == "Completed").count(),
        "Rejected": db.query(Appointment).filter(Appointment.status == "Rejected").count(),
        "Referred_To_Dermatologist": db.query(Appointment).filter(Appointment.status == "Referred_To_Dermatologist").count(),
    }

    return {
        "total_users": total_users,
        "users_by_role": users_by_role,
        "total_assessments": total_assessments,
        "concern_distribution": concern_distribution,
        "active_routines": active_routines,
        "doctor_prescribed_routines": doctor_prescribed,
        "total_progress_photos": total_photos,
        "total_appointments": total_appointments,
        "appointments_by_status": appointments_by_status,
    }


@router.get("/users")
def list_all_users(
    role: str = "",
    search: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return all registered users with profile summaries.
    Supports optional `role` and `search` (name/email) filters.
    Admin-only — returns 403 for all other roles.
    Does NOT expose hashed_password or secrets.
    """
    verify_admin(current_user)

    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.order_by(User.created_at.desc()).all()

    result = []
    for u in users:
        # Apply search filter (name or email)
        if search and search.lower() not in u.name.lower() and search.lower() not in u.email.lower():
            continue

        profile = db.query(UserProfile).filter(UserProfile.user_id == u.id).first()
        latest_assessment = (
            db.query(SkinAssessment)
            .filter(SkinAssessment.user_id == u.id)
            .order_by(SkinAssessment.created_at.desc())
            .first()
        )
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.strftime("%Y-%m-%d") if u.created_at else None,
            "skin_type": profile.skin_type if profile else None,
            "health_score": latest_assessment.overall_score if latest_assessment else None,
            "last_assessment_date": latest_assessment.created_at.strftime("%Y-%m-%d") if (latest_assessment and latest_assessment.created_at) else None,
        })

    return {"total": len(result), "users": result}


@router.get("/activity")
def get_recent_activity(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return recent platform activity sourced from real database records.
    Events are derived from: recent assessments, recent appointments, recent registrations.
    Admin-only.
    Does NOT expose passwords or internal secrets.
    """
    verify_admin(current_user)

    events = []

    # Recent user registrations (last 5)
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    for u in recent_users:
        events.append({
            "type": "registration",
            "icon": "users",
            "title": "New user registered",
            "detail": f"{u.name} ({u.role})",
            "timestamp": u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "",
        })

    # Recent assessments (last 5)
    recent_assessments = (
        db.query(SkinAssessment)
        .order_by(SkinAssessment.created_at.desc())
        .limit(5)
        .all()
    )
    for a in recent_assessments:
        user = db.query(User).filter(User.id == a.user_id).first()
        events.append({
            "type": "assessment",
            "icon": "clip",
            "title": "Skin assessment completed",
            "detail": f"Score {round(a.overall_score)}/100 — {user.name if user else 'Unknown'}",
            "timestamp": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "",
        })

    # Recent appointments (last 5)
    recent_appts = (
        db.query(Appointment)
        .order_by(Appointment.created_at.desc())
        .limit(5)
        .all()
    )
    for appt in recent_appts:
        user = db.query(User).filter(User.id == appt.user_id).first()
        events.append({
            "type": "appointment",
            "icon": "cal",
            "title": f"Appointment {appt.status.lower().replace('_', ' ')}",
            "detail": f"{user.name if user else 'Patient'} → {appt.target_role}",
            "timestamp": appt.created_at.strftime("%Y-%m-%d %H:%M") if appt.created_at else "",
        })

    # Sort all events by timestamp descending and return the requested limit
    events.sort(key=lambda e: e["timestamp"], reverse=True)
    return {"events": events[:limit]}
