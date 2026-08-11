from typing import List, Dict, Any, Tuple

# Chemical Conflict Matrix Rules
INCOMPATIBLE_PAIRINGS = [
    (
        {"Retinol", "Retinoids", "Tretinoin"},
        {"Salicylic Acid (BHA)", "Glycolic Acid", "Lactic Acid (AHA)", "AHAs/BHA"},
        "Combining Retinoids with strong AHA/BHA exfoliants in the same step can cause severe skin barrier damage and irritation."
    ),
    (
        {"Vitamin C", "L-Ascorbic Acid"},
        {"Niacinamide"},
        "High-concentration Vitamin C combined directly with Niacinamide may neutralize efficiency or cause temporary flushing."
    ),
    (
        {"Benzoyl Peroxide"},
        {"Retinol", "Retinoids"},
        "Benzoyl Peroxide can oxidize Retinol, rendering both actives ineffective while increasing dryness."
    ),
    (
        {"Glycolic Acid", "Lactic Acid (AHA)", "Mandelic Acid"},
        {"Salicylic Acid (BHA)", "AHAs/BHA"},
        "Layering AHA (Glycolic/Lactic Acid) with BHA (Salicylic Acid) in the same step can disrupt skin pH balance and over-exfoliate, significantly increasing sensitivity and barrier compromise risk."
    ),
    (
        {"Fragrance", "Parfum", "Fragrance Oils"},
        {"Glycolic Acid", "Salicylic Acid (BHA)", "Retinol", "Retinoids", "Benzoyl Peroxide"},
        "Fragrance combined with strong actives (acids, retinoids, or peroxides) substantially elevates the risk of contact sensitization and allergic dermatitis, particularly for reactive or sensitive skin."
    ),
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

    # 2. Chemical Conflict Matrix Engine (case-insensitive matching)
    # Build a mapping from lowercased ingredient to its original display name
    ing_lower_map: dict = {}
    for orig in ingredients:
        key = orig.strip().lower()
        if key and key not in ing_lower_map:
            ing_lower_map[key] = orig.strip()
    ing_lower_set = set(ing_lower_map.keys())

    for group_a, group_b, warning_msg in INCOMPATIBLE_PAIRINGS:
        # Normalize each pairing group to lowercase for matching
        group_a_lower = {k.lower() for k in group_a}
        group_b_lower = {k.lower() for k in group_b}
        match_a_lower = group_a_lower.intersection(ing_lower_set)
        match_b_lower = group_b_lower.intersection(ing_lower_set)
        if match_a_lower and match_b_lower:
            # Use original display names in the warning
            match_a_display = [ing_lower_map[m] for m in match_a_lower]
            match_b_display = [ing_lower_map[m] for m in match_b_lower]
            conflict_warnings.append(
                f"Chemical Conflict ({', '.join(match_a_display)} + {', '.join(match_b_display)}): {warning_msg}"
            )
            score -= 25.0


    score = max(0.0, round(score, 1))

    if score >= 85 and not allergy_alerts and not conflict_warnings:
        status = "Safe"
    elif score >= 60:
        status = "Warning"
    else:
        status = "Unsafe"

    return score, status, allergy_alerts, conflict_warnings
