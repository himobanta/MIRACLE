from fastapi import APIRouter
from ..schemas import IngredientEvaluationRequest
from ..ingredient_engine import evaluate_ingredient_safety

# Canonical prefix: /api/v1/ingredients  (plural)
# Alias prefix   : /api/v1/ingredient    (singular — legacy, kept for backwards-compatibility)
router = APIRouter(tags=["Ingredient Intelligence"])

# Shared handler — used by both canonical and legacy routes
def _evaluate(req: IngredientEvaluationRequest):
    score, status, allergy_alerts, conflict_warnings = evaluate_ingredient_safety(
        ingredients=req.ingredients,
        user_allergies=req.user_allergies,
        routine_time=req.routine_time
    )
    return {
        "product_name": req.product_name,
        "safety_score": score,
        "status": status,
        "allergy_alerts": allergy_alerts,
        "conflict_warnings": conflict_warnings,
        "evaluated_ingredients_count": len(req.ingredients)
    }

# Canonical endpoint (plural — preferred)
@router.post("/api/v1/ingredients/evaluate")
def evaluate_ingredients(req: IngredientEvaluationRequest):
    """Evaluate ingredient safety for a product (canonical path)."""
    return _evaluate(req)

# Backwards-compatible alias (singular — legacy)
@router.post("/api/v1/ingredient/evaluate")
def evaluate_ingredients_alias(req: IngredientEvaluationRequest):
    """Evaluate ingredient safety (alias for /api/v1/ingredients/evaluate)."""
    return _evaluate(req)

@router.get("/api/v1/ingredients")
def list_ingredients(
    search: str = None,
    category: str = None,
    page: int = 1,
    per_page: int = 50
):
    """Search and browse the ingredients knowledge base."""
    from ..database import SessionLocal
    from ..models import Ingredient
    from sqlalchemy import or_

    db = SessionLocal()
    try:
        q = db.query(Ingredient)
        if search:
            q = q.filter(or_(
                Ingredient.name.ilike(f"%{search}%"),
                Ingredient.function.ilike(f"%{search}%"),
                Ingredient.description.ilike(f"%{search}%")
            ))
        if category and category != "All":
            q = q.filter(Ingredient.category.ilike(f"%{category}%"))

        total = q.count()
        ingredients = q.order_by(Ingredient.name.asc()).offset((page - 1) * per_page).limit(per_page).all()

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "ingredients": [
                {
                    "id": ing.id,
                    "name": ing.name,
                    "category": ing.category or "Active Ingredient",
                    "function": ing.function or "Skin conditioning agent",
                    "description": ing.description or "Dermatologically active ingredient with verified skin efficacy profile.",
                    "benefits": ing.benefits or ["Barrier support", "Skin conditioning"],
                    "concerns": ing.concerns or [],
                    "skin_types": ing.skin_types or ["All Skin Types"],
                    "avoid_with": ing.avoid_with or [],
                    "safety_rating": ing.safety_rating or "Safe"
                }
                for ing in ingredients
            ]
        }
    finally:
        db.close()

