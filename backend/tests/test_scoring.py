from backend.app.scoring_engine import calculate_skin_health_score

def test_perfect_score_math():
    """
    Test 1 (Milestone 2 Requirement): Math & Score Precision
    Goal: Ensure ideal inputs yield a perfect 100.0 score.
    """
    concerns = {
        "acne_severity": 0,
        "hyperpigmentation_severity": 0,
        "redness_severity": 0,
        "wrinkles_severity": 0
    }
    lifestyle = {
        "stress_level": 2,
        "sun_exposure": "Low"
    }
    sleep_hours = 8.0
    water_intake_l = 3.0
    adherence_pct = 100.0

    overall, subscores, detected = calculate_skin_health_score(
        concerns_severity=concerns,
        lifestyle=lifestyle,
        sleep_hours=sleep_hours,
        water_intake_l=water_intake_l,
        adherence_pct=adherence_pct
    )

    assert overall == 100.0, f"Expected 100.0 score, got {overall}"
    assert subscores["condition"] == 100.0
    assert subscores["lifestyle"] == 100.0
    assert subscores["sleep"] == 100.0
    assert subscores["hydration"] == 100.0
    assert subscores["consistency"] == 100.0

def test_deductions_math():
    """
    Verify points deduction for high severity concerns and low sleep.
    """
    concerns = {"acne_severity": 8, "hyperpigmentation_severity": 5}
    lifestyle = {"stress_level": 8, "sun_exposure": "High"}
    sleep_hours = 4.0  # 50% of 8h -> 50 points
    water_intake_l = 1.5  # 50% of 3L -> 50 points
    adherence_pct = 80.0

    overall, subscores, detected = calculate_skin_health_score(
        concerns_severity=concerns,
        lifestyle=lifestyle,
        sleep_hours=sleep_hours,
        water_intake_l=water_intake_l,
        adherence_pct=adherence_pct
    )

    assert overall < 100.0
    assert subscores["condition"] == 78.0  # 100 - 15 - 7
    assert subscores["sleep"] == 50.0
    assert subscores["hydration"] == 50.0
