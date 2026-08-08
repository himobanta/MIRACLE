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
