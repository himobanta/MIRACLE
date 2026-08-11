from typing import Dict, Any, List, Tuple
import numpy as np

def calculate_skin_health_score(
    concerns_severity: Dict[str, int],
    lifestyle: Dict[str, Any],
    sleep_hours: float,
    water_intake_l: float,
    adherence_pct: float = 100.0
) -> Tuple[float, Dict[str, float], List[str]]:
    """
    Executes the exact Milestone 2 Weighted Scoring Model:
    Score = 0.35(C) + 0.20(L) + 0.15(S) + 0.20(A) + 0.10(H)
    """
    # 1. Condition Subscore (C - 35%)
    # Start at 100. Deduct 15 for High Severity (>7), 7 for Medium Severity (4-7), 0 for Low (<4).
    c_score = 100.0
    detected_concerns = []
    for concern, severity in concerns_severity.items():
        if severity > 0:
            label = concern.replace("_severity", "").replace("_", " ").title()
            if severity >= 7:
                c_score -= 15.0
                detected_concerns.append(f"{label} (Severe: {severity}/10)")
            elif severity >= 4:
                c_score -= 7.0
                detected_concerns.append(f"{label} (Moderate: {severity}/10)")
            else:
                detected_concerns.append(f"{label} (Mild: {severity}/10)")
    c_score = float(np.clip(c_score, 0.0, 100.0))

    # 2. Lifestyle Subscore (L - 20%)
    # Start at 100. Deduct based on stress level and UV exposure.
    l_score = 100.0
    stress = lifestyle.get("stress_level", 4)
    raw_sun = lifestyle.get("sun_exposure", "Moderate")
    sun = str(raw_sun).strip().title() if raw_sun else "Moderate"
    if stress >= 7:
        l_score -= 20.0
    elif stress >= 5:
        l_score -= 10.0
        
    if sun in ["High", "Extreme"]:
        l_score -= 15.0
    elif sun == "Moderate":
        l_score -= 5.0
    l_score = float(np.clip(l_score, 0.0, 100.0))

    # 3. Sleep Subscore (S - 15%)
    # Ideal 8 hours
    s_score = float(np.clip((sleep_hours / 8.0) * 100.0, 0.0, 100.0))

    # 4. Consistency / Adherence Subscore (A - 20%)
    a_score = float(np.clip(adherence_pct, 0.0, 100.0))

    # 5. Hydration Subscore (H - 10%)
    # 3.0L daily benchmark
    h_score = float(np.clip((water_intake_l / 3.0) * 100.0, 0.0, 100.0))

    # Overarching Weighted Score
    overall = (0.35 * c_score) + (0.20 * l_score) + (0.15 * s_score) + (0.20 * a_score) + (0.10 * h_score)
    overall = round(float(np.clip(overall, 0.0, 100.0)), 1)

    subscores = {
        "condition": round(c_score, 1),
        "lifestyle": round(l_score, 1),
        "sleep": round(s_score, 1),
        "consistency": round(a_score, 1),
        "hydration": round(h_score, 1),
    }

    return overall, subscores, detected_concerns
