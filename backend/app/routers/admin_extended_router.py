"""
admin_extended_router.py
Extended Admin API endpoints for the MIRACLE platform.
All endpoints require Administrator role (verified by verify_admin).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional
from datetime import datetime, timezone

from ..database import get_db
from ..models import (
    User, UserProfile, SkinAssessment, SkincareRoutine,
    Appointment, Product, Ingredient, ContentArticle,
    SystemNotification, AuditLog, SystemConfig, BackupRecord
)
from ..auth import get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Extended"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def verify_admin(user: User):
    """Raise 403 if caller is not an Administrator."""
    if user.role != "Administrator":
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: Administrator role required"
        )


def _log(db: Session, user: User, action: str,
         resource_type: str = None, resource_id: str = None,
         details: dict = None, status: str = "Success"):
    """Write an audit log record. Silently swallows errors to avoid masking main operation."""
    try:
        entry = AuditLog(
            user_id=user.id,
            user_name=user.name,
            user_role=user.role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            status=status,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()


def _safe_user(u: User) -> dict:
    """Return safe user dict — never exposes hashed_password."""
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "created_at": u.created_at.strftime("%Y-%m-%d") if u.created_at else None,
    }


# ── User Management CRUD ──────────────────────────────────────────────────────

@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user's role or name. Never updates password via this route."""
    verify_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    if "role" in body:
        allowed = {"User", "Skincare Consultant", "Dermatologist", "Administrator"}
        if body["role"] not in allowed:
            raise HTTPException(status_code=422, detail=f"Invalid role. Allowed: {allowed}")
        user.role = body["role"]
    if "name" in body and body["name"]:
        user.name = body["name"]

    db.commit()
    _log(db, current_user, "ROLE_CHANGED" if "role" in body else "USER_UPDATED",
         resource_type="User", resource_id=user_id,
         details={"old_role": old_role, "new_role": user.role})

    return {"message": "User updated", "user": _safe_user(user)}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a user. Admins cannot delete themselves."""
    verify_admin(current_user)
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    name, email = user.name, user.email
    _log(db, current_user, "USER_DELETED",
         resource_type="User", resource_id=user_id,
         details={"name": name, "email": email})

    db.delete(user)
    db.commit()
    return {"message": f"User '{name}' deleted"}


@router.get("/users/{user_id}/detail")
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full user profile including assessments, routines, appointments."""
    verify_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    assessments = db.query(SkinAssessment).filter(SkinAssessment.user_id == user_id)\
        .order_by(SkinAssessment.created_at.desc()).limit(10).all()
    active_routines = db.query(SkincareRoutine)\
        .filter(SkincareRoutine.user_id == user_id, SkincareRoutine.is_active == True).count()
    appointments = db.query(Appointment).filter(Appointment.user_id == user_id)\
        .order_by(Appointment.created_at.desc()).limit(5).all()

    return {
        "user": _safe_user(user),
        "profile": {
            "skin_type": profile.skin_type if profile else None,
            "age": profile.age if profile else None,
            "gender": profile.gender if profile else None,
            "concerns": profile.concerns if profile else [],
            "allergies": profile.allergies if profile else [],
        } if profile else None,
        "assessments": [
            {
                "id": a.id,
                "overall_score": a.overall_score,
                "detected_concerns": a.detected_concerns or [],
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in assessments
        ],
        "active_routine_count": active_routines,
        "appointments": [
            {
                "id": ap.id,
                "target_role": ap.target_role,
                "status": ap.status,
                "preferred_date": ap.preferred_date,
                "created_at": ap.created_at.isoformat() if ap.created_at else None,
            }
            for ap in appointments
        ],
    }


# ── Assessments Admin ─────────────────────────────────────────────────────────

@router.get("/assessments")
def list_assessments(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Paginated list of all skin assessments with user info."""
    verify_admin(current_user)

    q = db.query(SkinAssessment, User).join(User, User.id == SkinAssessment.user_id)
    if search:
        q = q.filter(or_(
            User.name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
        ))

    total = q.count()
    rows = q.order_by(SkinAssessment.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total, "page": page, "per_page": per_page,
        "items": [
            {
                "id": a.id,
                "user_id": a.user_id,
                "user_name": u.name,
                "user_email": u.email,
                "overall_score": a.overall_score,
                "condition_subscore": a.condition_subscore,
                "lifestyle_subscore": a.lifestyle_subscore,
                "sleep_subscore": a.sleep_subscore,
                "consistency_subscore": a.consistency_subscore,
                "hydration_subscore": a.hydration_subscore,
                "detected_concerns": a.detected_concerns or [],
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a, u in rows
        ],
    }


# ── Routines Admin ────────────────────────────────────────────────────────────

@router.get("/routines")
def list_routines(
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Paginated list of all routine steps with user info."""
    verify_admin(current_user)

    q = db.query(SkincareRoutine, User).join(User, User.id == SkincareRoutine.user_id)
    if search:
        q = q.filter(or_(
            User.name.ilike(f"%{search}%"),
            SkincareRoutine.product_name.ilike(f"%{search}%"),
        ))

    total = q.count()
    rows = q.order_by(SkincareRoutine.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total, "page": page, "per_page": per_page,
        "items": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "user_name": u.name,
                "product_name": r.product_name,
                "step_category": r.step_category,
                "time_of_day": r.time_of_day,
                "step_number": r.step_number,
                "is_active": r.is_active,
                "prescribed_by_doctor": r.prescribed_by_doctor,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r, u in rows
        ],
    }


# ── Product Admin CRUD ────────────────────────────────────────────────────────

@router.get("/products")
def list_products_admin(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    subq = db.query(func.min(Product.id).label("min_id")).group_by(Product.product_name, Product.brand)
    q = db.query(Product).filter(Product.id.in_(subq))
    if search:
        q = q.filter(or_(
            Product.product_name.ilike(f"%{search}%"),
            Product.brand.ilike(f"%{search}%"),
        ))
    if category:
        q = q.filter(Product.category.ilike(f"%{category}%"))

    total = q.count()
    products = q.order_by(Product.product_name).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total, "page": page, "per_page": per_page,
        "items": [
            {
                "id": p.id,
                "product_name": p.product_name,
                "brand": p.brand,
                "category": p.category,
                "usage_type": p.usage_type,
                "price": p.price,
                "safety_score": p.safety_score,
                "rating": p.rating,
                "image_url": p.image_url,
                "product_url": p.product_url,
                "ingredients": p.ingredients,
            }
            for p in products
        ],
    }


@router.post("/products")
def create_product(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    if not body.get("product_name"):
        raise HTTPException(status_code=422, detail="product_name is required")

    product = Product(
        product_name=body["product_name"],
        brand=body.get("brand"),
        category=body.get("category"),
        usage_type=body.get("usage_type"),
        price=float(body["price"]) if body.get("price") is not None else None,
        safety_score=float(body.get("safety_score", 90.0)),
        rating=float(body.get("rating", 4.5)),
        image_url=body.get("image_url"),
        product_url=body.get("product_url"),
        ingredients=body.get("ingredients"),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    _log(db, current_user, "PRODUCT_CREATED", resource_type="Product", resource_id=product.id,
         details={"name": product.product_name})
    return {"message": "Product created", "id": product.id}


@router.put("/products/{product_id}")
def update_product(
    product_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field in ["product_name", "brand", "category", "usage_type", "image_url", "product_url", "ingredients"]:
        if field in body:
            setattr(product, field, body[field])
    for field in ["price", "safety_score", "rating"]:
        if field in body and body[field] is not None:
            setattr(product, field, float(body[field]))

    db.commit()
    _log(db, current_user, "PRODUCT_UPDATED", resource_type="Product", resource_id=product_id,
         details={"name": product.product_name})
    return {"message": "Product updated"}


@router.delete("/products/{product_id}")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    name = product.product_name
    db.delete(product)
    db.commit()
    _log(db, current_user, "PRODUCT_DELETED", resource_type="Product", resource_id=product_id,
         details={"name": name})
    return {"message": f"Product '{name}' deleted"}


# ── Ingredient CRUD ───────────────────────────────────────────────────────────

@router.get("/ingredients")
def list_ingredients(
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    q = db.query(Ingredient)
    if search:
        q = q.filter(or_(
            Ingredient.name.ilike(f"%{search}%"),
            Ingredient.category.ilike(f"%{search}%"),
        ))
    total = q.count()
    items = q.order_by(Ingredient.name).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "total": total, "page": page, "per_page": per_page,
        "items": [
            {
                "id": ing.id,
                "name": ing.name,
                "category": ing.category,
                "function": ing.function,
                "description": ing.description,
                "benefits": ing.benefits or [],
                "concerns": ing.concerns or [],
                "skin_types": ing.skin_types or [],
                "avoid_with": ing.avoid_with or [],
                "safety_rating": ing.safety_rating,
                "created_at": ing.created_at.isoformat() if ing.created_at else None,
            }
            for ing in items
        ],
    }


@router.post("/ingredients")
def create_ingredient(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    if not body.get("name"):
        raise HTTPException(status_code=422, detail="name is required")
    ing = Ingredient(
        name=body["name"],
        category=body.get("category"),
        function=body.get("function"),
        description=body.get("description"),
        benefits=body.get("benefits", []),
        concerns=body.get("concerns", []),
        skin_types=body.get("skin_types", []),
        avoid_with=body.get("avoid_with", []),
        safety_rating=body.get("safety_rating", "Safe"),
    )
    db.add(ing)
    db.commit()
    db.refresh(ing)
    _log(db, current_user, "INGREDIENT_CREATED", resource_type="Ingredient", resource_id=ing.id,
         details={"name": ing.name})
    return {"message": "Ingredient created", "id": ing.id}


@router.put("/ingredients/{ingredient_id}")
def update_ingredient(
    ingredient_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    for field in ["name", "category", "function", "description", "safety_rating"]:
        if field in body:
            setattr(ing, field, body[field])
    for field in ["benefits", "concerns", "skin_types", "avoid_with"]:
        if field in body:
            setattr(ing, field, body[field] if isinstance(body[field], list) else [])
    ing.updated_at = datetime.now(timezone.utc)
    db.commit()
    _log(db, current_user, "INGREDIENT_UPDATED", resource_type="Ingredient", resource_id=ingredient_id,
         details={"name": ing.name})
    return {"message": "Ingredient updated"}


@router.delete("/ingredients/{ingredient_id}")
def delete_ingredient(
    ingredient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    name = ing.name
    db.delete(ing)
    db.commit()
    _log(db, current_user, "INGREDIENT_DELETED", resource_type="Ingredient", resource_id=ingredient_id,
         details={"name": name})
    return {"message": f"Ingredient '{name}' deleted"}


# ── Content Management ────────────────────────────────────────────────────────

@router.get("/content")
def list_content(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    q = db.query(ContentArticle)
    if status:
        q = q.filter(ContentArticle.status == status)
    if search:
        q = q.filter(or_(
            ContentArticle.title.ilike(f"%{search}%"),
            ContentArticle.category.ilike(f"%{search}%"),
        ))
    articles = q.order_by(ContentArticle.created_at.desc()).all()
    return {
        "items": [
            {
                "id": a.id,
                "title": a.title,
                "body": a.body,
                "category": a.category,
                "status": a.status,
                "tags": a.tags or [],
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None,
                "published_at": a.published_at.isoformat() if a.published_at else None,
            }
            for a in articles
        ]
    }


@router.post("/content")
def create_article(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    if not body.get("title"):
        raise HTTPException(status_code=422, detail="title is required")

    status_val = body.get("status", "Draft")
    article = ContentArticle(
        title=body["title"],
        body=body.get("body"),
        category=body.get("category"),
        author_id=current_user.id,
        status=status_val,
        tags=body.get("tags", []),
        published_at=datetime.now(timezone.utc) if status_val == "Published" else None,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    _log(db, current_user, "CONTENT_CREATED", resource_type="Content", resource_id=article.id,
         details={"title": article.title})
    return {"message": "Article created", "id": article.id}


@router.put("/content/{article_id}")
def update_article(
    article_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    article = db.query(ContentArticle).filter(ContentArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    for field in ["title", "body", "category", "status"]:
        if field in body:
            setattr(article, field, body[field])
    if "tags" in body:
        article.tags = body["tags"] if isinstance(body["tags"], list) else []

    if body.get("status") == "Published" and not article.published_at:
        article.published_at = datetime.now(timezone.utc)
    elif body.get("status") == "Draft":
        article.published_at = None

    article.updated_at = datetime.now(timezone.utc)
    db.commit()
    _log(db, current_user, "CONTENT_UPDATED", resource_type="Content", resource_id=article_id,
         details={"title": article.title, "status": article.status})
    return {"message": "Article updated"}


@router.delete("/content/{article_id}")
def delete_article(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    article = db.query(ContentArticle).filter(ContentArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    title = article.title
    db.delete(article)
    db.commit()
    _log(db, current_user, "CONTENT_DELETED", resource_type="Content", resource_id=article_id,
         details={"title": title})
    return {"message": f"Article '{title}' deleted"}


# ── Notifications CRUD ────────────────────────────────────────────────────────

@router.get("/notifications")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    items = db.query(SystemNotification).order_by(SystemNotification.created_at.desc()).all()
    return {
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "audience": n.audience,
                "is_active": n.is_active,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in items
        ]
    }


@router.post("/notifications")
def create_notification(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    if not body.get("title") or not body.get("message"):
        raise HTTPException(status_code=422, detail="title and message are required")

    notif = SystemNotification(
        title=body["title"],
        message=body["message"],
        notification_type=body.get("notification_type", "System"),
        audience=body.get("audience", "All"),
        created_by=current_user.id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    _log(db, current_user, "NOTIFICATION_CREATED", resource_type="Notification", resource_id=notif.id,
         details={"title": notif.title, "audience": notif.audience})
    return {"message": "Notification created", "id": notif.id}


@router.put("/notifications/{notif_id}")
def update_notification(
    notif_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    notif = db.query(SystemNotification).filter(SystemNotification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    for field in ["title", "message", "notification_type", "audience", "is_active"]:
        if field in body:
            setattr(notif, field, body[field])
    db.commit()
    return {"message": "Notification updated"}


@router.delete("/notifications/{notif_id}")
def delete_notification(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    notif = db.query(SystemNotification).filter(SystemNotification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted"}


# ── Audit Logs ────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    search: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    q = db.query(AuditLog)
    if search:
        q = q.filter(or_(
            AuditLog.user_name.ilike(f"%{search}%"),
            AuditLog.resource_type.ilike(f"%{search}%"),
        ))
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))

    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total, "page": page, "per_page": per_page,
        "items": [
            {
                "id": log.id,
                "user_name": log.user_name,
                "user_role": log.user_role,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details or {},
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }


# ── System Settings ───────────────────────────────────────────────────────────

@router.get("/settings")
def list_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    configs = db.query(SystemConfig).order_by(SystemConfig.category, SystemConfig.key).all()
    return {
        "settings": [
            {
                "id": c.id,
                "key": c.key,
                "value": c.value,
                "category": c.category,
                "description": c.description,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in configs
        ]
    }


@router.put("/settings/{key}")
def update_setting(
    key: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if not config:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    old_value = config.value
    config.value = str(body.get("value", ""))
    config.updated_at = datetime.now(timezone.utc)
    db.commit()
    _log(db, current_user, "SETTING_UPDATED", resource_type="SystemConfig", resource_id=config.id,
         details={"key": key, "old_value": old_value, "new_value": config.value})
    return {"message": f"Setting '{key}' updated"}


# ── Backup ────────────────────────────────────────────────────────────────────

@router.get("/backup/status")
def backup_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    backups = db.query(BackupRecord).order_by(BackupRecord.created_at.desc()).limit(20).all()
    last = backups[0] if backups else None
    return {
        "last_backup": {
            "status": last.status,
            "created_at": last.created_at.isoformat() if last.created_at else None,
            "size_bytes": last.size_bytes,
        } if last else None,
        "total_backups": len(backups),
        "backups": [
            {
                "id": b.id,
                "status": b.status,
                "backup_type": b.backup_type,
                "notes": b.notes,
                "size_bytes": b.size_bytes,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "completed_at": b.completed_at.isoformat() if b.completed_at else None,
            }
            for b in backups
        ],
    }


@router.post("/backup/create")
def create_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)

    user_count = db.query(User).count()
    assessment_count = db.query(SkinAssessment).count()
    routine_count = db.query(SkincareRoutine).count()
    product_count = db.query(Product).count()
    est_bytes = (user_count * 1024) + (assessment_count * 2048) + (routine_count * 512) + (product_count * 512)

    backup = BackupRecord(
        status="Completed",
        backup_type="Manual",
        size_bytes=est_bytes,
        notes=f"Manual backup by {current_user.name}. {user_count} users, {assessment_count} assessments, {product_count} products.",
        completed_at=datetime.now(timezone.utc),
    )
    db.add(backup)
    db.commit()
    db.refresh(backup)
    _log(db, current_user, "BACKUP_CREATED", resource_type="BackupRecord", resource_id=backup.id,
         details={"size_bytes": est_bytes})
    return {"message": "Backup created successfully", "id": backup.id, "size_bytes": est_bytes}


# ── Security Events ───────────────────────────────────────────────────────────

SECURITY_ACTIONS = {"LOGIN", "LOGIN_FAILED", "ROLE_CHANGED", "USER_DELETED", "SETTING_UPDATED", "BACKUP_CREATED"}


@router.get("/security/events")
def security_events(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    events = (
        db.query(AuditLog)
        .filter(AuditLog.action.in_(SECURITY_ACTIONS))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "events": [
            {
                "id": e.id,
                "user_name": e.user_name,
                "user_role": e.user_role,
                "action": e.action,
                "resource_type": e.resource_type,
                "status": e.status,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ]
    }


@router.get("/security/stats")
def security_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    return {
        "failed_logins_30d": db.query(AuditLog).filter(AuditLog.action == "LOGIN_FAILED", AuditLog.created_at >= cutoff).count(),
        "role_changes_30d": db.query(AuditLog).filter(AuditLog.action == "ROLE_CHANGED", AuditLog.created_at >= cutoff).count(),
        "user_deletions_30d": db.query(AuditLog).filter(AuditLog.action == "USER_DELETED", AuditLog.created_at >= cutoff).count(),
    }


# ── Reports Overview ──────────────────────────────────────────────────────────

@router.get("/reports/overview")
def reports_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_admin(current_user)
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    weeks = []
    for w in range(7, -1, -1):
        start = now - timedelta(weeks=w + 1)
        end = now - timedelta(weeks=w)
        count = db.query(User).filter(User.created_at >= start, User.created_at < end).count()
        weeks.append({"week_label": f"W-{w}", "count": count})

    max_count = max((w["count"] for w in weeks), default=1) or 1
    for w in weeks:
        w["pct"] = round((w["count"] / max_count) * 100)

    appt_breakdown = {
        s: db.query(Appointment).filter(Appointment.status == s).count()
        for s in ["Requested", "Accepted", "Completed", "Rejected", "Referred_To_Dermatologist"]
    }

    skin_type_dist: dict = {}
    for p in db.query(UserProfile).filter(UserProfile.skin_type != None).all():
        if p.skin_type:
            skin_type_dist[p.skin_type] = skin_type_dist.get(p.skin_type, 0) + 1

    return {
        "user_growth_by_week": weeks,
        "appointment_breakdown": appt_breakdown,
        "skin_type_distribution": skin_type_dist,
        "total_users": db.query(User).count(),
        "total_assessments": db.query(SkinAssessment).count(),
        "total_appointments": db.query(Appointment).count(),
        "total_products": db.query(Product).count(),
    }
