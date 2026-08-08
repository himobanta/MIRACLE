from backend.app.routine_generator import generate_customized_routine
from backend.app.ingredient_engine import evaluate_ingredient_safety

def test_sensitive_skin_safety_guardrails():
    """
    Test 2 (Milestone 2 & 3 Requirement): Routine Safety Boundaries
    Goal: Ensure system never gives harsh chemical exfoliants/retinoids to sensitive skin.
    """
    concerns = {"redness_severity": 8, "acne_severity": 4}
    steps = generate_customized_routine("Sensitive", concerns)

    for step in steps:
        actives = step.get("active_ingredients", [])
        for harsh in ["Retinol", "Salicylic Acid (BHA)", "Glycolic Acid"]:
            assert harsh not in actives, f"Harsh active '{harsh}' found in sensitive skin routine step!"

def test_chemical_conflict_matrix():
    """
    Verify chemical conflict detection for Retinoids + AHAs/BHAs.
    """
    ingredients = ["Retinol", "Glycolic Acid", "Ceramides"]
    allergies = []
    
    score, status, allergy_alerts, conflict_warnings = evaluate_ingredient_safety(ingredients, allergies)
    
    assert status in ["Warning", "Unsafe"]
    assert len(conflict_warnings) > 0
    assert "Chemical Conflict" in conflict_warnings[0]

def test_allergen_matching_engine():
    """
    Verify allergen matching logic.
    """
    ingredients = ["Salicylic Acid", "Fragrance", "Parabens"]
    allergies = ["Fragrance"]

    score, status, allergy_alerts, conflict_warnings = evaluate_ingredient_safety(ingredients, allergies)

    assert len(allergy_alerts) > 0
    assert "Allergen Match" in allergy_alerts[0]
