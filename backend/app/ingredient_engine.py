from typing import List, Dict, Any, Tuple

# Chemical Conflict Matrix Rules
INCOMPATIBLE_PAIRINGS = [
    ({"Retinol", "Retinoids", "Tretinoin"}, {"Salicylic Acid (BHA)", "Glycolic Acid", "Lactic Acid (AHA)", "AHAs/BHA"}, "Combining Retinoids with strong AHA/BHA exfoliants in the same step can cause severe skin barrier damage and irritation."),
    ({"Vitamin C", "L-Ascorbic Acid"}, {"Niacinamide"}, "High-concentration Vitamin C combined directly with Niacinamide may neutralize efficiency or cause temporary flushing."),
    ({"Benzoyl Peroxide"}, {"Retinol", "Retinoids"}, "Benzoyl Peroxide can oxidize Retinol, rendering both actives ineffective while increasing dryness.")
]

def evaluate_ingredient_safety(
    ingredients: List[str],
    user_allergies: List[str],
    routine_time: str = "PM"
) -> Tuple[float, str, List[str], List[str]]:
    """
    Evaluates ingredient safety, flags user allergens, detects chemical conflicts,
    and returns (safety_score 0-100, status_label, allergy_alerts, conflict_warnings).
    """
    score = 100.0
    allergy_alerts = []
    conflict_warnings = []

    clean_ingredients = [ing.strip().lower() for ing in ingredients]
    clean_allergies = [alg.strip().lower() for alg in user_allergies]

    # 1. Allergy Matching Engine
    for allergy in clean_allergies:
        for ing in clean_ingredients:
            if allergy in ing or ing in allergy:
                allergy_alerts.append(f"Allergen Match: Product contains '{ing.title()}' which matches your sensitivity profile ('{allergy.title()}').")
                score -= 30.0

    # 2. Chemical Conflict Matrix Engine
    ing_set = set(ingredients)
    for group_a, group_b, warning_msg in INCOMPATIBLE_PAIRINGS:
        match_a = group_a.intersection(ing_set)
        match_b = group_b.intersection(ing_set)
        if match_a and match_b:
            conflict_warnings.append(f"Chemical Conflict ({', '.join(match_a)} + {', '.join(match_b)}): {warning_msg}")
            score -= 25.0

    score = max(0.0, round(score, 1))

    if score >= 85 and not allergy_alerts and not conflict_warnings:
        status = "Safe"
    elif score >= 60:
        status = "Warning"
    else:
        status = "Unsafe"

    return score, status, allergy_alerts, conflict_warnings
