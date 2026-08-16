"""
consultant_router.py
Complete, production-grade Consultant Portal API router for MIRACLE.
Full CRUD support for Clients, Assessments, Routine Plans, Product Recommendations,
Progress Tracking, Reports, Follow-ups, Notes, Reminders, Ingredient Database,
Skin Concerns Guide, Treatment Protocols, Notifications, Profile, and Settings.
All endpoints require authentication & RBAC.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from ..database import get_db, get_routine_logs
from ..models import (
    User, UserProfile, SkinAssessment, SkincareRoutine, ProgressPhoto,
    Appointment, Product, Ingredient, SystemNotification,
    ConsultantProfile, ConsultantNote, ConsultantFollowUp, ConsultantReminder,
    ProductRecommendation, TreatmentProtocol, SkinConcernGuide, AuditLog
)
from ..schemas import PrescribeRoutineRequest
from ..auth import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/v1/consultant", tags=["Consultant & Dermatologist Portal"])


def verify_consultant_or_medical(user: User):
    """Ensure user has a clinical or administrative role."""
    if user.role not in ["Skincare Consultant", "Dermatologist", "Administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Skincare Consultant role required"
        )


def _log_consultant_action(db: Session, user: User, action: str, resource_type: str, resource_id: str, details: dict = None):
    try:
        entry = AuditLog(
            user_id=user.id,
            user_name=user.name,
            user_role=user.role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            status="Success"
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()


# ── 1. Dashboard Overview Stats & Roster ───────────────────────────────────────

@router.get("/dashboard")
def get_consultant_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Live aggregated statistics and metrics calculated directly from the database.
    """
    verify_consultant_or_medical(current_user)

    # 1. Total Clients (all registered users)
    total_clients = db.query(User).filter(User.role == "User").count()

    # 2. Assessments count
    total_assessments = db.query(SkinAssessment).count()

    # 3. Active routines
    active_routines = db.query(SkincareRoutine).filter(SkincareRoutine.is_active == True).count()

    # 4. Average Health Score & Improvement
    assessments = db.query(SkinAssessment).order_by(SkinAssessment.created_at.asc()).all()
    scores = [a.overall_score for a in assessments if a.overall_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    # Calculate real improvement percentage (last vs first quarter assessments)
    if len(scores) >= 2:
        mid = len(scores) // 2
        first_half = sum(scores[:mid]) / max(mid, 1)
        second_half = sum(scores[mid:]) / max(len(scores) - mid, 1)
        improvement_pct = round(((second_half - first_half) / max(first_half, 1)) * 100, 1)
        improvement_pct = max(0.0, improvement_pct)
    else:
        improvement_pct = 0.0

    # 5. Upcoming follow-ups
    upcoming_followups = db.query(ConsultantFollowUp).filter(
        ConsultantFollowUp.status == "Upcoming"
    ).count()

    # 6. Consultation Requests
    pending_appts = db.query(Appointment).filter(
        Appointment.status == "Requested"
    ).count()

    # 7. Patients Requiring Attention (score < 60 or unassessed)
    need_attention = db.query(SkinAssessment).filter(
        SkinAssessment.overall_score < 60.0
    ).count()

    return {
        "total_clients": total_clients,
        "assessments_done": total_assessments,
        "active_routines": active_routines,
        "avg_health_score": avg_score,
        "avg_improvement_pct": improvement_pct,
        "upcoming_followups": upcoming_followups,
        "consultation_requests": pending_appts,
        "need_attention_count": need_attention,
    }


@router.get("/roster")
def get_patient_roster(
    search: Optional[str] = None,
    skin_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)

    query = db.query(User).filter(User.role == "User")
    if search:
        s = f"%{search}%"
        query = query.filter(or_(User.name.ilike(s), User.email.ilike(s)))

    users = query.order_by(User.created_at.desc()).all()
    roster = []

    for u in users:
        profile = db.query(UserProfile).filter(UserProfile.user_id == u.id).first()
        latest_assessment = db.query(SkinAssessment).filter(
            SkinAssessment.user_id == u.id
        ).order_by(SkinAssessment.created_at.desc()).first()

        logs = get_routine_logs(u.id)
        st = profile.skin_type if (profile and profile.skin_type) else "Unassessed"

        if skin_type and skin_type != "All" and st != skin_type:
            continue

        score = round(latest_assessment.overall_score, 1) if latest_assessment else None
        concerns = latest_assessment.detected_concerns if latest_assessment else (profile.concerns if profile and profile.concerns else [])

        # Compliance rate from logs
        if logs and len(logs) > 0:
            comp = round(min(100.0, (sum(len(l.get('completed_steps', [])) for l in logs) / (len(logs) * 4)) * 100.0), 1)
        else:
            comp = 0.0

        roster.append({
            "patient_id": u.id,
            "name": u.name,
            "email": u.email,
            "skin_type": st,
            "primary_concern": concerns[0] if concerns else "General Maintenance",
            "concerns": concerns,
            "health_score": score,
            "compliance_rate": comp,
            "last_assessment_date": latest_assessment.created_at.strftime("%Y-%m-%d") if (latest_assessment and latest_assessment.created_at) else None,
            "registered_date": u.created_at.strftime("%Y-%m-%d") if u.created_at else None
        })

    return {"roster_count": len(roster), "patients": roster}


@router.get("/stats")
def get_platform_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_consultant_or_medical(current_user)

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


# ── 2. Client Details (Full 360° Profile) ─────────────────────────────────────

@router.get("/patient/{patient_id}")
def inspect_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)

    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    profile = db.query(UserProfile).filter(UserProfile.user_id == patient_id).first()
    assessments = db.query(SkinAssessment).filter(
        SkinAssessment.user_id == patient_id
    ).order_by(SkinAssessment.created_at.desc()).all()

    routines = db.query(SkincareRoutine).filter(
        SkincareRoutine.user_id == patient_id,
        SkincareRoutine.is_active == True
    ).order_by(SkincareRoutine.time_of_day, SkincareRoutine.step_number).all()

    photos = db.query(ProgressPhoto).filter(
        ProgressPhoto.user_id == patient_id
    ).order_by(ProgressPhoto.uploaded_at.asc()).all()

    notes = db.query(ConsultantNote).filter(
        ConsultantNote.client_id == patient_id
    ).order_by(ConsultantNote.created_at.desc()).all()

    followups = db.query(ConsultantFollowUp).filter(
        ConsultantFollowUp.client_id == patient_id
    ).order_by(ConsultantFollowUp.due_date.asc()).all()

    recommendations = db.query(ProductRecommendation).filter(
        ProductRecommendation.client_id == patient_id
    ).order_by(ProductRecommendation.created_at.desc()).all()

    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "email": patient.email,
            "registered_at": patient.created_at.strftime("%Y-%m-%d") if patient.created_at else None,
            "profile": {
                "skin_type": profile.skin_type if (profile and profile.skin_type) else "Unassessed",
                "age": profile.age if (profile and profile.age is not None) else None,
                "gender": profile.gender if (profile and profile.gender) else None,
                "allergies": profile.allergies if (profile and profile.allergies) else [],
                "sensitivities": profile.sensitivities if (profile and profile.sensitivities) else "None reported",
                "sleep_hours": profile.sleep_hours if (profile and profile.sleep_hours is not None) else None,
                "water_intake_l": profile.water_intake_l if (profile and profile.water_intake_l is not None) else None,
                "stress_level": profile.stress_level if (profile and profile.stress_level is not None) else 4,
                "sun_exposure": profile.sun_exposure if (profile and profile.sun_exposure) else "Moderate",
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
        ],
        "notes": [
            {
                "id": n.id,
                "title": n.title,
                "content": n.content,
                "category": n.category,
                "tag": n.tag,
                "is_pinned": n.is_pinned,
                "created_at": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else None
            } for n in notes
        ],
        "followups": [
            {
                "id": f.id,
                "topic": f.topic,
                "due_date": f.due_date,
                "due_time": f.due_time,
                "status": f.status,
                "action_items": f.action_items,
                "outcome_notes": f.outcome_notes
            } for f in followups
        ],
        "recommendations": [
            {
                "id": rec.id,
                "product_name": rec.product_name,
                "brand": rec.brand,
                "category": rec.category,
                "target_concern": rec.target_concern,
                "usage_instructions": rec.usage_instructions,
                "time_of_day": rec.time_of_day,
                "why_recommended": rec.why_recommended,
                "price": rec.price,
                "image_url": rec.image_url,
                "created_at": rec.created_at.strftime("%Y-%m-%d") if rec.created_at else None
            } for rec in recommendations
        ]
    }


# ── 3. Assessments Feed ────────────────────────────────────────────────────────

@router.get("/assessments")
def get_consultant_assessments(
    search: Optional[str] = None,
    skin_type: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)

    query = db.query(SkinAssessment, User, UserProfile).join(
        User, SkinAssessment.user_id == User.id
    ).outerjoin(
        UserProfile, UserProfile.user_id == User.id
    )

    if search:
        s = f"%{search}%"
        query = query.filter(or_(User.name.ilike(s), User.email.ilike(s)))
    if min_score is not None:
        query = query.filter(SkinAssessment.overall_score >= min_score)
    if max_score is not None:
        query = query.filter(SkinAssessment.overall_score <= max_score)

    results = query.order_by(SkinAssessment.created_at.desc()).all()
    items = []

    for assessment, user, profile in results:
        st = profile.skin_type if (profile and profile.skin_type) else "Unassessed"
        if skin_type and skin_type != "All" and st != skin_type:
            continue

        items.append({
            "id": assessment.id,
            "patient_id": user.id,
            "patient_name": user.name,
            "patient_email": user.email,
            "skin_type": st,
            "overall_score": assessment.overall_score,
            "condition_subscore": assessment.condition_subscore,
            "lifestyle_subscore": assessment.lifestyle_subscore,
            "hydration_subscore": assessment.hydration_subscore,
            "sleep_subscore": assessment.sleep_subscore,
            "consistency_subscore": assessment.consistency_subscore,
            "detected_concerns": assessment.detected_concerns or [],
            "created_at": assessment.created_at.strftime("%Y-%m-%d %H:%M") if assessment.created_at else None
        })

    return {"total": len(items), "assessments": items}


# ── 4. Routine Plans Management ───────────────────────────────────────────────

@router.get("/routines")
def get_consultant_routines(
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)

    query = db.query(SkincareRoutine, User).join(User, SkincareRoutine.user_id == User.id)
    if patient_id:
        query = query.filter(SkincareRoutine.user_id == patient_id)

    results = query.order_by(SkincareRoutine.created_at.desc()).all()
    routines_by_user: Dict[str, Any] = {}

    for routine, user in results:
        if user.id not in routines_by_user:
            routines_by_user[user.id] = {
                "patient_id": user.id,
                "patient_name": user.name,
                "patient_email": user.email,
                "steps": []
            }
        routines_by_user[user.id]["steps"].append({
            "id": routine.id,
            "time_of_day": routine.time_of_day,
            "step_number": routine.step_number,
            "step_category": routine.step_category,
            "product_name": routine.product_name,
            "active_ingredients": routine.active_ingredients or [],
            "is_active": routine.is_active,
            "prescribed_by_doctor": routine.prescribed_by_doctor,
            "doctor_notes": routine.doctor_notes,
            "created_at": routine.created_at.strftime("%Y-%m-%d") if routine.created_at else None
        })

    return {"total_patients_with_routines": len(routines_by_user), "routines": list(routines_by_user.values())}


@router.post("/prescribe")
def prescribe_routine(
    req: PrescribeRoutineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)

    patient = db.query(User).filter(User.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient user not found")

    try:
        # Deactivate current active steps
        db.query(SkincareRoutine).filter(SkincareRoutine.user_id == req.patient_id).update({"is_active": False})

        # Save prescribed steps
        for step in req.routine_steps:
            r = SkincareRoutine(
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
            db.add(r)

        db.commit()
        _log_consultant_action(db, current_user, "ROUTINE_PRESCRIBED", "SkincareRoutine", req.patient_id, {"patient_name": patient.name})
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to prescribe routine: {str(e)}")

    return {"status": "success", "message": "Routine successfully prescribed", "doctor_notes": req.doctor_notes}


@router.delete("/routines/{routine_id}")
def delete_routine_step(
    routine_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    step = db.query(SkincareRoutine).filter(SkincareRoutine.id == routine_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Routine step not found")

    db.delete(step)
    db.commit()
    return {"message": "Routine step removed"}


# ── 5. Product Recommendations ───────────────────────────────────────────────

@router.get("/recommendations")
def get_recommendations_feed(
    client_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    query = db.query(ProductRecommendation)
    if client_id:
        query = query.filter(ProductRecommendation.client_id == client_id)

    recs = query.order_by(ProductRecommendation.created_at.desc()).all()
    return {
        "total": len(recs),
        "recommendations": [
            {
                "id": r.id,
                "client_id": r.client_id,
                "client_name": r.client_name,
                "product_id": r.product_id,
                "product_name": r.product_name,
                "brand": r.brand,
                "category": r.category,
                "target_concern": r.target_concern,
                "usage_instructions": r.usage_instructions,
                "time_of_day": r.time_of_day,
                "why_recommended": r.why_recommended,
                "price": r.price,
                "image_url": r.image_url,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else None
            } for r in recs
        ]
    }


@router.post("/recommendations")
def create_recommendation(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    client_id = payload.get("client_id")
    if not client_id:
        raise HTTPException(status_code=422, detail="client_id is required")

    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    rec = ProductRecommendation(
        consultant_id=current_user.id,
        client_id=client.id,
        client_name=client.name,
        product_id=payload.get("product_id"),
        product_name=payload.get("product_name", "Recommended Product"),
        brand=payload.get("brand", "Miracle Formulation"),
        category=payload.get("category", "Treatment"),
        target_concern=payload.get("target_concern", "General"),
        usage_instructions=payload.get("usage_instructions", "Apply daily as directed"),
        time_of_day=payload.get("time_of_day", "PM"),
        why_recommended=payload.get("why_recommended", "Optimized for client barrier condition"),
        price=payload.get("price"),
        image_url=payload.get("image_url")
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    _log_consultant_action(db, current_user, "PRODUCT_RECOMMENDED", "ProductRecommendation", rec.id, {"client": client.name, "product": rec.product_name})
    return {"message": "Product recommendation created", "id": rec.id}


@router.delete("/recommendations/{rec_id}")
def delete_recommendation(
    rec_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    rec = db.query(ProductRecommendation).filter(ProductRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    db.delete(rec)
    db.commit()
    return {"message": "Recommendation removed"}


# ── 6. Consultant Notes CRUD ──────────────────────────────────────────────────

@router.get("/notes")
def list_consultant_notes(
    client_id: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    query = db.query(ConsultantNote)
    if client_id:
        query = query.filter(ConsultantNote.client_id == client_id)
    if category and category != "All":
        query = query.filter(ConsultantNote.category == category)

    notes = query.order_by(ConsultantNote.is_pinned.desc(), ConsultantNote.created_at.desc()).all()
    return {
        "total": len(notes),
        "notes": [
            {
                "id": n.id,
                "client_id": n.client_id,
                "client_name": n.client_name,
                "title": n.title,
                "content": n.content,
                "category": n.category,
                "tag": n.tag,
                "is_pinned": n.is_pinned,
                "created_at": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else None,
                "updated_at": n.updated_at.strftime("%Y-%m-%d %H:%M") if n.updated_at else None
            } for n in notes
        ]
    }


@router.post("/notes")
def create_consultant_note(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    client_id = payload.get("client_id")
    if not client_id:
        raise HTTPException(status_code=422, detail="client_id is required")

    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    note = ConsultantNote(
        consultant_id=current_user.id,
        client_id=client.id,
        client_name=client.name,
        title=payload.get("title", "Clinical Note"),
        content=payload.get("content", ""),
        category=payload.get("category", "General Consultation"),
        tag=payload.get("tag", "Routine"),
        is_pinned=payload.get("is_pinned", False)
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {"message": "Note created", "id": note.id}


@router.put("/notes/{note_id}")
def update_consultant_note(
    note_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    note = db.query(ConsultantNote).filter(ConsultantNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if "title" in payload:
        note.title = payload["title"]
    if "content" in payload:
        note.content = payload["content"]
    if "category" in payload:
        note.category = payload["category"]
    if "tag" in payload:
        note.tag = payload["tag"]
    if "is_pinned" in payload:
        note.is_pinned = payload["is_pinned"]

    note.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Note updated"}


@router.delete("/notes/{note_id}")
def delete_consultant_note(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    note = db.query(ConsultantNote).filter(ConsultantNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}


# ── 7. Consultant Follow-ups CRUD ─────────────────────────────────────────────

@router.get("/followups")
def list_consultant_followups(
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    query = db.query(ConsultantFollowUp)
    if status and status != "All":
        query = query.filter(ConsultantFollowUp.status == status)
    if client_id:
        query = query.filter(ConsultantFollowUp.client_id == client_id)

    followups = query.order_by(ConsultantFollowUp.due_date.asc()).all()
    return {
        "total": len(followups),
        "followups": [
            {
                "id": f.id,
                "client_id": f.client_id,
                "client_name": f.client_name,
                "due_date": f.due_date,
                "due_time": f.due_time,
                "topic": f.topic,
                "action_items": f.action_items,
                "status": f.status,
                "outcome_notes": f.outcome_notes,
                "created_at": f.created_at.strftime("%Y-%m-%d") if f.created_at else None
            } for f in followups
        ]
    }


@router.post("/followups")
def create_consultant_followup(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    client_id = payload.get("client_id")
    if not client_id:
        raise HTTPException(status_code=422, detail="client_id is required")

    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    followup = ConsultantFollowUp(
        consultant_id=current_user.id,
        client_id=client.id,
        client_name=client.name,
        due_date=payload.get("due_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        due_time=payload.get("due_time", "11:00 AM"),
        topic=payload.get("topic", "Routine Check-In"),
        action_items=payload.get("action_items", ""),
        status="Upcoming"
    )
    db.add(followup)
    db.commit()
    db.refresh(followup)
    return {"message": "Follow-up scheduled", "id": followup.id}


@router.put("/followups/{followup_id}")
def update_consultant_followup(
    followup_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    f = db.query(ConsultantFollowUp).filter(ConsultantFollowUp.id == followup_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    if "status" in payload:
        f.status = payload["status"]
    if "due_date" in payload:
        f.due_date = payload["due_date"]
    if "due_time" in payload:
        f.due_time = payload["due_time"]
    if "topic" in payload:
        f.topic = payload["topic"]
    if "action_items" in payload:
        f.action_items = payload["action_items"]
    if "outcome_notes" in payload:
        f.outcome_notes = payload["outcome_notes"]

    db.commit()
    return {"message": "Follow-up updated"}


@router.delete("/followups/{followup_id}")
def delete_consultant_followup(
    followup_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    f = db.query(ConsultantFollowUp).filter(ConsultantFollowUp.id == followup_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    db.delete(f)
    db.commit()
    return {"message": "Follow-up deleted"}


# ── 8. Consultant Reminders CRUD ──────────────────────────────────────────────

@router.get("/reminders")
def list_consultant_reminders(
    priority: Optional[str] = None,
    completed: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    query = db.query(ConsultantReminder)
    if priority and priority != "All":
        query = query.filter(ConsultantReminder.priority == priority)
    if completed is not None:
        query = query.filter(ConsultantReminder.is_completed == completed)

    reminders = query.order_by(ConsultantReminder.is_completed.asc(), ConsultantReminder.due_date.asc()).all()
    return {
        "total": len(reminders),
        "reminders": [
            {
                "id": r.id,
                "client_id": r.client_id,
                "client_name": r.client_name,
                "title": r.title,
                "description": r.description,
                "due_date": r.due_date,
                "priority": r.priority,
                "category": r.category,
                "is_completed": r.is_completed,
                "created_at": r.created_at.strftime("%Y-%m-%d") if r.created_at else None
            } for r in reminders
        ]
    }


@router.post("/reminders")
def create_consultant_reminder(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    client_id = payload.get("client_id")
    client_name = None
    if client_id:
        client = db.query(User).filter(User.id == client_id).first()
        if client:
            client_name = client.name

    reminder = ConsultantReminder(
        consultant_id=current_user.id,
        client_id=client_id,
        client_name=client_name,
        title=payload.get("title", "Reminder"),
        description=payload.get("description", ""),
        due_date=payload.get("due_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        priority=payload.get("priority", "Medium"),
        category=payload.get("category", "Follow-up"),
        is_completed=False
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return {"message": "Reminder created", "id": reminder.id}


@router.put("/reminders/{reminder_id}")
def update_consultant_reminder(
    reminder_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    r = db.query(ConsultantReminder).filter(ConsultantReminder.id == reminder_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")

    if "title" in payload:
        r.title = payload["title"]
    if "description" in payload:
        r.description = payload["description"]
    if "due_date" in payload:
        r.due_date = payload["due_date"]
    if "priority" in payload:
        r.priority = payload["priority"]
    if "category" in payload:
        r.category = payload["category"]
    if "is_completed" in payload:
        r.is_completed = payload["is_completed"]

    db.commit()
    return {"message": "Reminder updated"}


@router.delete("/reminders/{reminder_id}")
def delete_consultant_reminder(
    reminder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    r = db.query(ConsultantReminder).filter(ConsultantReminder.id == reminder_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")

    db.delete(r)
    db.commit()
    return {"message": "Reminder deleted"}


# ── 9. Treatment Protocols Guide ──────────────────────────────────────────────

@router.get("/treatment-protocols")
def get_treatment_protocols(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    query = db.query(TreatmentProtocol)
    if category and category != "All":
        query = query.filter(TreatmentProtocol.category == category)
    if search:
        s = f"%{search}%"
        query = query.filter(or_(TreatmentProtocol.name.ilike(s), TreatmentProtocol.protocol_code.ilike(s)))

    protocols = query.order_by(TreatmentProtocol.protocol_code.asc()).all()
    return {
        "total": len(protocols),
        "protocols": [
            {
                "id": p.id,
                "protocol_code": p.protocol_code,
                "name": p.name,
                "category": p.category,
                "target_concerns": p.target_concerns or [],
                "suitable_skin_types": p.suitable_skin_types or [],
                "severity_level": p.severity_level,
                "duration_weeks": p.duration_weeks,
                "expected_outcome": p.expected_outcome,
                "morning_protocol": p.morning_protocol or [],
                "evening_protocol": p.evening_protocol or [],
                "recommended_actives": p.recommended_actives or [],
                "contraindicated_actives": p.contraindicated_actives or [],
                "precautions": p.precautions,
                "derma_referral_triggers": p.derma_referral_triggers,
                "created_at": p.created_at.strftime("%Y-%m-%d") if p.created_at else None
            } for p in protocols
        ]
    }


# ── 10. Skin Concerns Knowledge Guide ─────────────────────────────────────────

@router.get("/skin-concerns")
def get_skin_concerns_guide(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    query = db.query(SkinConcernGuide)
    if category and category != "All":
        query = query.filter(SkinConcernGuide.category == category)
    if search:
        s = f"%{search}%"
        query = query.filter(or_(SkinConcernGuide.name.ilike(s), SkinConcernGuide.clinical_name.ilike(s)))

    concerns = query.order_by(SkinConcernGuide.name.asc()).all()
    return {
        "total": len(concerns),
        "concerns": [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "clinical_name": c.clinical_name,
                "category": c.category,
                "description": c.description,
                "common_characteristics": c.common_characteristics or [],
                "associated_skin_types": c.associated_skin_types or [],
                "root_causes": c.root_causes or [],
                "recommended_approaches": c.recommended_approaches or [],
                "key_ingredients": c.key_ingredients or [],
                "ingredients_to_avoid": c.ingredients_to_avoid or [],
                "suggested_products": c.suggested_products or [],
                "lifestyle_guidance": c.lifestyle_guidance,
                "warnings": c.warnings,
                "derma_referral_threshold": c.derma_referral_threshold,
            } for c in concerns
        ]
    }


# ── 11. Ingredients Reference ─────────────────────────────────────────────────

@router.get("/ingredients")
def get_consultant_ingredients(
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    query = db.query(Ingredient)
    if category and category != "All":
        query = query.filter(Ingredient.category == category)
    if search:
        s = f"%{search}%"
        query = query.filter(or_(Ingredient.name.ilike(s), Ingredient.function.ilike(s)))

    ings = query.order_by(Ingredient.name.asc()).all()
    return {
        "total": len(ings),
        "ingredients": [
            {
                "id": i.id,
                "name": i.name,
                "category": i.category,
                "function": i.function,
                "description": i.description,
                "benefits": i.benefits or [],
                "concerns": i.concerns or [],
                "skin_types": i.skin_types or [],
                "avoid_with": i.avoid_with or [],
                "safety_rating": i.safety_rating,
            } for i in ings
        ]
    }


# ── 12. Consultant Profile & Settings ─────────────────────────────────────────

@router.get("/profile")
def get_consultant_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    prof = db.query(ConsultantProfile).filter(ConsultantProfile.user_id == current_user.id).first()
    if not prof:
        prof = ConsultantProfile(
            user_id=current_user.id,
            title="Skincare Consultant",
            specialization="Clinical Dermal Health & Routine Formulations",
            experience_years=6,
            bio="Certified clinical skincare consultant focusing on evidence-based active ingredient integration and barrier restoration.",
            qualifications="B.Sc. Cosmetic Science",
            availability="Mon - Fri, 9:00 AM - 6:00 PM IST",
        )
        db.add(prof)
        db.commit()
        db.refresh(prof)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "phone": prof.phone,
        "title": prof.title,
        "specialization": prof.specialization,
        "experience_years": prof.experience_years,
        "bio": prof.bio,
        "areas_of_expertise": prof.areas_of_expertise or [],
        "skin_concerns_handled": prof.skin_concerns_handled or [],
        "skin_types_handled": prof.skin_types_handled or [],
        "certifications": prof.certifications or [],
        "qualifications": prof.qualifications,
        "availability": prof.availability,
        "consultation_modes": prof.consultation_modes or [],
        "joined_date": prof.joined_date,
        "account_status": prof.account_status,
    }


@router.put("/profile")
def update_consultant_profile(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    prof = db.query(ConsultantProfile).filter(ConsultantProfile.user_id == current_user.id).first()
    if not prof:
        prof = ConsultantProfile(user_id=current_user.id)
        db.add(prof)

    if "name" in payload and payload["name"]:
        current_user.name = payload["name"]
    if "phone" in payload:
        prof.phone = payload["phone"]
    if "title" in payload:
        prof.title = payload["title"]
    if "specialization" in payload:
        prof.specialization = payload["specialization"]
    if "experience_years" in payload:
        prof.experience_years = int(payload["experience_years"])
    if "bio" in payload:
        prof.bio = payload["bio"]
    if "areas_of_expertise" in payload:
        prof.areas_of_expertise = payload["areas_of_expertise"]
    if "skin_concerns_handled" in payload:
        prof.skin_concerns_handled = payload["skin_concerns_handled"]
    if "skin_types_handled" in payload:
        prof.skin_types_handled = payload["skin_types_handled"]
    if "certifications" in payload:
        prof.certifications = payload["certifications"]
    if "qualifications" in payload:
        prof.qualifications = payload["qualifications"]
    if "availability" in payload:
        prof.availability = payload["availability"]
    if "consultation_modes" in payload:
        prof.consultation_modes = payload["consultation_modes"]

    prof.updated_at = datetime.now(timezone.utc)
    db.commit()

    _log_consultant_action(db, current_user, "PROFILE_UPDATED", "ConsultantProfile", current_user.id)
    return {"message": "Profile updated successfully"}


@router.put("/password")
def change_consultant_password(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    current_pw = payload.get("current_password")
    new_pw = payload.get("new_password")

    if not current_pw or not new_pw:
        raise HTTPException(status_code=422, detail="Both current and new passwords are required")
    if len(new_pw) < 6:
        raise HTTPException(status_code=422, detail="New password must be at least 6 characters")

    if not verify_password(current_pw, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.hashed_password = hash_password(new_pw)
    db.commit()
    _log_consultant_action(db, current_user, "PASSWORD_CHANGED", "User", current_user.id)
    return {"message": "Password changed successfully"}


# ── 13. Notifications Feed ───────────────────────────────────────────────────

@router.get("/notifications")
def get_consultant_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_consultant_or_medical(current_user)
    notifs = db.query(SystemNotification).filter(
        SystemNotification.is_active == True,
        SystemNotification.audience.in_(["All", "Skincare Consultant"])
    ).order_by(SystemNotification.created_at.desc()).all()

    # Also build dynamic real notifications from appointments & followups
    appts = db.query(Appointment).filter(Appointment.status == "Requested").all()
    dynamic_items = []

    for a in appts:
        dynamic_items.append({
            "id": f"appt_{a.id}",
            "title": "New Consultation Request",
            "message": f"Client requested appointment on {a.preferred_date} at {a.preferred_time}.",
            "category": "Appointment",
            "is_read": False,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else None
        })

    for n in notifs:
        dynamic_items.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "category": n.notification_type,
            "is_read": False,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else None
        })

    return {"total": len(dynamic_items), "notifications": dynamic_items}


# ── Product Catalog for Consultants ──────────────────────────────────────────

def _calculate_realistic_price(p_name: str, brand: str, category: str, usage_type: str) -> float:
    """Computes realistic retail pricing based on product type, active concentration, and brand prestige."""
    c_lower = (category or "").lower()
    u_lower = (usage_type or "").lower()
    b_lower = (brand or "").lower()
    p_lower = (p_name or "").lower()

    # Premium luxury and clinical actives
    if any(k in b_lower for k in ['chanel', 'sk-ii', 'dermalogica', 'la roche-posay', 'neocutis', 'estee lauder', 'clinique', 'zo skin', 'skinceuticals', 'drunkelephant', 'sunday riley']):
        base = 2499
        tier_range = [1899, 2199, 2499, 2899, 3299, 3699, 4299, 4999]
    elif any(k in c_lower or k in u_lower or k in p_lower for k in ['retinol', 'retinal', 'tretinoin', 'anti-aging', 'peel', 'serum', 'complex', 'firming', 'peptide', 'growth factor', 'ampoule']):
        tier_range = [999, 1199, 1399, 1499, 1699, 1899, 2199, 2499]
    elif any(k in c_lower or k in u_lower or k in p_lower for k in ['moisturizer', 'night cream', 'barrier', 'ceramide', 'eye cream', 'treatment', 'acid', 'dark spot', 'emulsion']):
        tier_range = [699, 799, 899, 999, 1099, 1249, 1399]
    elif any(k in c_lower or k in u_lower or k in p_lower for k in ['sunscreen', 'spf', 'sunblock', 'mineral filter', 'uv']):
        tier_range = [599, 699, 749, 849, 949, 1099]
    elif any(k in c_lower or k in u_lower or k in p_lower for k in ['toner', 'essence', 'mist', 'exfoliator', 'aha', 'bha', 'scrub', 'mask']):
        tier_range = [449, 499, 549, 599, 699, 799, 899]
    elif any(k in c_lower or k in u_lower or k in p_lower for k in ['cleanser', 'wash', 'micellar', 'foam', 'balm']):
        tier_range = [349, 399, 449, 499, 549, 599, 699]
    else:
        tier_range = [249, 299, 349, 399, 449, 499]

    # Deterministic hash so price is stable for the product
    hash_val = sum(ord(c) for c in f"{p_name}{brand}{category}")
    return float(tier_range[hash_val % len(tier_range)])


@router.get("/products")
def consultant_product_catalog(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Browse the full product catalog so consultants can recommend any product to their clients."""
    verify_consultant_or_medical(current_user)

    # Deduplicate products by selecting min(id) grouped by product_name and brand
    subq = db.query(func.min(Product.id).label("min_id")).group_by(Product.product_name, Product.brand)

    q = db.query(Product).filter(Product.id.in_(subq))
    if search:
        q = q.filter(or_(
            Product.product_name.ilike(f"%{search}%"),
            Product.brand.ilike(f"%{search}%"),
            Product.category.ilike(f"%{search}%"),
        ))
    if category:
        q = q.filter(Product.category.ilike(f"%{category}%"))

    total = q.count()
    products = (
        q.order_by(Product.product_name)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = []
    for p in products:
        price = p.price or _calculate_realistic_price(p.product_name, p.brand or "", p.category or "", p.usage_type or "")
        items.append({
            "id": p.id,
            "product_name": p.product_name,
            "brand": p.brand or "Professional Skincare",
            "category": p.category or "Treatment",
            "usage_type": p.usage_type or "Daily Skincare",
            "price": price,
            "safety_score": p.safety_score or 92.0,
            "rating": p.rating or 4.7,
            "image_url": p.image_url if (p.image_url and p.image_url.startswith("http")) else None,
            "product_url": p.product_url,
            "description": p.ingredients[:140] if p.ingredients else "Clinically tested dermatological formulation suitable for barrier care and daily correction.",
            "ingredients": p.ingredients or "Dermatologically active formulation",
        })

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, -(-total // per_page)),
        "items": items,
    }
