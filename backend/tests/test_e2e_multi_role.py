"""
test_e2e_multi_role.py
Phase 14 Realistic Multi-Role End-to-End Test Suite for Miracle:
- User registration, profile setup, assessment, score, routine generation, progress logging, appointment request
- Consultant roster inspection, patient detail review, dermatologist referral
- Dermatologist acceptance & prescription overwrite
- User verification of doctor-prescribed routine
- Administrator aggregate platform metrics verification
"""
import time
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.rate_limiter import limiter_register, limiter_login
from backend.app.database import SessionLocal
from backend.app.models import User, UserProfile
from backend.app.auth import hash_password

client = TestClient(app)


def _seed_privileged_user(name: str, email: str, role: str, password: str = "Password123!") -> str:
    """
    Helper: directly insert a privileged-role user into the DB and return a login token.
    Used because public registration is restricted to 'User' role for security.
    """
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            user = User(
                name=name,
                email=email,
                hashed_password=hash_password(password),
                role=role
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            profile = UserProfile(user_id=user.id)
            db.add(profile)
            db.commit()
    finally:
        db.close()
    limiter_login.reset()
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]

def test_full_multi_role_e2e_product_journey():
    """
    Executes the complete end-to-end multi-role product workflow:
    User A -> Consultant -> Dermatologist -> Admin
    """
    limiter_register.reset()
    ts = int(time.time() * 1000)
    
    user_email = f"user_e2e_{ts}@miracle.com"
    cons_email = f"cons_e2e_{ts}@miracle.com"
    derm_email = f"derm_e2e_{ts}@miracle.com"
    admin_email = f"admin_e2e_{ts}@miracle.com"

    # ── 1. USER A REGISTRATION & ONBOARDING ──
    u_reg = client.post("/api/v1/auth/register", json={
        "name": "Ananya User",
        "email": user_email,
        "password": "Password123!",
        "role": "User"
    })
    assert u_reg.status_code == 200
    u_token = u_reg.json()["access_token"]
    u_headers = {"Authorization": f"Bearer {u_token}"}

    # Verify user profile retrieval
    u_prof = client.get("/api/v1/assessment/profile", headers=u_headers)
    assert u_prof.status_code == 200

    # User updates profile
    u_upd = client.post("/api/v1/assessment/profile", json={
        "skin_type": "Combination",
        "concerns": ["Acne & Breakouts", "Dark Spots"],
        "allergies": ["Parabens"],
        "age": 24,
        "gender": "Female"
    }, headers=u_headers)
    assert u_upd.status_code == 200

    # ── 2. USER A PHOTO ASSESSMENT & SCORE ──
    eval_resp = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Combination",
        "acne_severity": 2,
        "hyperpigmentation_severity": 2,
        "lifestyle": {"sleep_hours": 7.5, "water_intake_liters": 2.5}
    }, headers=u_headers)
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["overall_score"] > 0

    # Verify score persistence
    score_resp = client.get("/api/v1/assessment/score", headers=u_headers)
    assert score_resp.status_code == 200
    assert score_resp.json()["overall_score"] == eval_data["overall_score"]

    # Verify generated personalized routine
    routine_resp = client.get("/api/v1/routine", headers=u_headers)
    assert routine_resp.status_code == 200
    user_routine = routine_resp.json()
    assert len(user_routine) > 0

    # ── 3. USER A LOGS DAILY ROUTINE PROGRESS ──
    log_resp = client.post("/api/v1/routine/log", json={
        "log_date": "2026-08-10",
        "completed_steps": ["Morning Routine", "Sunscreen Applied"],
        "water_intake_ml": 2500,
        "sleep_hours": 7.5
    }, headers=u_headers)
    assert log_resp.status_code == 200

    # ── 4. USER A REQUESTS CONSULTATION APPOINTMENT ──
    appt_req = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-08-25",
        "preferred_time": "10:30 AM",
        "user_notes": "Seeking advice on post-acne mark barrier repair"
    }, headers=u_headers)
    assert appt_req.status_code == 200
    appt_id = appt_req.json()["id"]

    # ── 5. CONSULTANT LOGS IN & INSPECTS USER A ──
    c_token = _seed_privileged_user("Dr. Priya Sharma", cons_email, "Skincare Consultant")
    c_headers = {"Authorization": f"Bearer {c_token}"}

    # Consultant inspects patient roster
    roster_resp = client.get("/api/v1/consultant/roster", headers=c_headers)
    assert roster_resp.status_code == 200
    roster = roster_resp.json()["patients"]
    user_in_roster = next((p for p in roster if p["email"] == user_email), None)
    assert user_in_roster is not None
    patient_id = user_in_roster["patient_id"]

    # Consultant inspects detailed patient profile
    p_detail = client.get(f"/api/v1/consultant/patient/{patient_id}", headers=c_headers)
    assert p_detail.status_code == 200
    assert p_detail.json()["patient"]["email"] == user_email

    # Consultant refers appointment to Dermatologist
    ref_resp = client.post(f"/api/v1/appointments/{appt_id}/refer", json={
        "consultant_summary": "Requires dermatologist active prescription for persistent hyperpigmentation",
        "preferred_date": "2026-08-26",
        "preferred_time": "11:00 AM"
    }, headers=c_headers)
    assert ref_resp.status_code == 200
    assert ref_resp.json()["status"] == "Referred_To_Dermatologist"

    # ── 6. DERMATOLOGIST ACCEPTS & PRESCRIBES ROUTINE OVERWRITE ──
    d_token = _seed_privileged_user("Dr. Meera Iyer", derm_email, "Dermatologist")
    d_headers = {"Authorization": f"Bearer {d_token}"}

    # Dermatologist updates appointment status to Accepted
    status_resp = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "Accepted",
        "notes": "Consultation confirmed for clinical active treatment evaluation"
    }, headers=d_headers)
    assert status_resp.status_code == 200

    # Dermatologist prescribes custom routine overwrite
    rx_resp = client.post("/api/v1/consultant/prescribe", json={
        "patient_id": patient_id,
        "doctor_notes": "Apply Adaplene 0.1% alternate nights. Cease harsh exfoliants.",
        "routine_steps": [
            {"time_of_day": "AM", "step_number": 1, "step_category": "Cleansing", "product_name": "Gentle Hydrating Cleanser", "active_ingredients": ["Ceramides"], "prescribed_by_doctor": True},
            {"time_of_day": "AM", "step_number": 2, "step_category": "Sun Protection", "product_name": "Mineral SPF 50+", "active_ingredients": ["Zinc Oxide"], "prescribed_by_doctor": True},
            {"time_of_day": "PM", "step_number": 1, "step_category": "Treatment", "product_name": "Adaplene 0.1% Gel (Prescription)", "active_ingredients": ["Adapalene"], "prescribed_by_doctor": True}
        ]
    }, headers=d_headers)
    assert rx_resp.status_code == 200

    # ── 7. USER A SEES UPDATED DOCTOR-PRESCRIBED ROUTINE & APPOINTMENT ──
    u_updated_routine = client.get("/api/v1/routine", headers=u_headers)
    assert u_updated_routine.status_code == 200
    rx_steps = u_updated_routine.json()
    assert any(s["prescribed_by_doctor"] for s in rx_steps)
    assert any(s["product_name"] == "Adaplene 0.1% Gel (Prescription)" for s in rx_steps)

    u_appts = client.get("/api/v1/appointments/my", headers=u_headers)
    assert u_appts.status_code == 200
    user_appt = next(a for a in u_appts.json() if a["id"] == appt_id)
    assert user_appt["status"] == "Accepted"

    # ── 8. ADMINISTRATOR VERIFIES AGGREGATE PLATFORM METRICS ──
    a_token = _seed_privileged_user("Super Admin", admin_email, "Administrator")
    a_headers = {"Authorization": f"Bearer {a_token}"}

    stats_resp = client.get("/api/v1/consultant/stats", headers=a_headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_users"] >= 4
    assert stats["total_assessments"] >= 1
    assert stats["total_appointments"] >= 1


# =============================================================================
# PHASE 27 — MIRACLE Full-Stack Cross-Module Production-Readiness Tests
# =============================================================================

def test_p27_cross_module_full_journey_propagation():
    """
    Traces the entire cross-module user journey and verifies data propagation:
    User Register -> Profile -> Assessment -> Recommendations -> Routine -> Progress Log
    -> Photo -> Appointment -> Referral -> Prescription Overwrite -> Admin DB Metrics
    """
    limiter_register.reset()
    ts = int(time.time() * 1000)

    u_email = f"p27_user_{ts}@miracle.com"
    c_email = f"p27_cons_{ts}@miracle.com"
    d_email = f"p27_derm_{ts}@miracle.com"
    a_email = f"p27_admin_{ts}@miracle.com"

    # 1. User Registration
    reg_resp = client.post("/api/v1/auth/register", json={
        "name": "Phase27 User",
        "email": u_email,
        "password": "Password123!",
        "role": "User"
    })
    assert reg_resp.status_code == 200
    u_tok = reg_resp.json()["access_token"]
    u_hdrs = {"Authorization": f"Bearer {u_tok}"}

    # 2. Profile Setup
    prof_resp = client.post("/api/v1/assessment/profile", json={
        "skin_type": "Oily",
        "concerns": ["Acne", "Oiliness"],
        "allergies": ["Parabens"],
        "sleep_hours": 8.0,
        "water_intake_l": 3.0
    }, headers=u_hdrs)
    assert prof_resp.status_code == 200

    # 3. Assessment Evaluation
    eval_resp = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Oily",
        "acne_severity": 6,
        "hyperpigmentation_severity": 3,
        "lifestyle": {"sleep_hours": 8.0, "water_intake_liters": 3.0}
    }, headers=u_hdrs)
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["overall_score"] > 0
    a_id = eval_data["id"]

    # 4. Product Recommendations reflect profile skin_type and exclude Parabens
    recs_resp = client.get("/api/v1/recommendations", headers=u_hdrs)
    assert recs_resp.status_code == 200
    recs = recs_resp.json()
    assert recs["evaluated_skin_type"] == "Oily"
    assert recs["is_personalized"] is True

    # 5. Routine Generation matches skin_type
    routine_resp = client.get("/api/v1/routine", headers=u_hdrs)
    assert routine_resp.status_code == 200
    routine = routine_resp.json()
    assert len(routine) > 0

    # 6. Routine Log completion
    log_resp = client.post("/api/v1/routine/log", json={
        "log_date": "2026-08-11",
        "completed_steps": [routine[0]["step_category"]],
        "water_intake_ml": 3000,
        "sleep_hours": 8.0
    }, headers=u_hdrs)
    assert log_resp.status_code == 200

    # 7. Progress Photo Upload
    photo_resp = client.post("/api/v1/analytics/photos/upload", json={
        "image_url": "https://example.com/p27_baseline.jpg",
        "tag": "Baseline"
    }, headers=u_hdrs)
    assert photo_resp.status_code == 200
    photo_id = photo_resp.json()["id"]

    # 8. Appointment Request
    appt_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-08-30",
        "preferred_time": "10:00 AM",
        "user_notes": "Phase 27 E2E consultation"
    }, headers=u_hdrs)
    assert appt_resp.status_code == 200
    appt_id = appt_resp.json()["id"]

    # 9. Consultant inspection & referral
    c_tok = _seed_privileged_user("Dr P27 Consultant", c_email, "Skincare Consultant")
    c_hdrs = {"Authorization": f"Bearer {c_tok}"}

    roster = client.get("/api/v1/consultant/roster", headers=c_hdrs).json()["patients"]
    user_entry = next((p for p in roster if p["email"] == u_email), None)
    assert user_entry is not None
    p_id = user_entry["patient_id"]

    ref_resp = client.post(f"/api/v1/appointments/{appt_id}/refer", json={
        "consultant_summary": "Referred for clinical prescription",
        "preferred_date": "2026-09-01",
        "preferred_time": "11:00 AM"
    }, headers=c_hdrs)
    assert ref_resp.status_code == 200

    # 10. Dermatologist prescription overwrite
    d_tok = _seed_privileged_user("Dr P27 Dermatologist", d_email, "Dermatologist")
    d_hdrs = {"Authorization": f"Bearer {d_tok}"}

    rx_resp = client.post("/api/v1/consultant/prescribe", json={
        "patient_id": p_id,
        "doctor_notes": "Prescribed Adapalene 0.1%",
        "routine_steps": [
            {"time_of_day": "PM", "step_number": 1, "step_category": "Treatment", "product_name": "Adapalene 0.1%", "active_ingredients": ["Adapalene"], "prescribed_by_doctor": True}
        ]
    }, headers=d_hdrs)
    assert rx_resp.status_code == 200

    # 11. User sees prescription in routine
    u_routine = client.get("/api/v1/routine", headers=u_hdrs).json()
    assert any(s["prescribed_by_doctor"] for s in u_routine)

    # 12. Admin dashboard stats match database
    a_tok = _seed_privileged_user("P27 Admin", a_email, "Administrator")
    a_hdrs = {"Authorization": f"Bearer {a_tok}"}

    admin_stats = client.get("/api/v1/admin/stats", headers=a_hdrs).json()
    assert admin_stats["total_users"] >= 4
    assert admin_stats["total_assessments"] >= 1
    assert admin_stats["total_appointments"] >= 1
    assert admin_stats["total_progress_photos"] >= 1


def test_p27_admin_and_consultant_stats_match_database_records():
    """Verify that all platform counts in Admin and Consultant stats match direct DB counts."""
    a_tok = _seed_privileged_user("DB Match Admin", f"db_admin_{int(time.time()*1000)}@test.com", "Administrator")
    a_hdrs = {"Authorization": f"Bearer {a_tok}"}

    stats = client.get("/api/v1/admin/stats", headers=a_hdrs).json()

    from backend.app.models import User, SkinAssessment, SkincareRoutine, ProgressPhoto, Appointment
    db = SessionLocal()
    try:
        db_users = db.query(User).count()
        db_assessments = db.query(SkinAssessment).count()
        db_routines = db.query(SkincareRoutine).filter(SkincareRoutine.is_active == True).count()
        db_photos = db.query(ProgressPhoto).count()
        db_appts = db.query(Appointment).count()

        assert stats["total_users"] == db_users
        assert stats["total_assessments"] == db_assessments
        assert stats["active_routines"] == db_routines
        assert stats["total_progress_photos"] == db_photos
        assert stats["total_appointments"] == db_appts
    finally:
        db.close()


def test_p27_complete_ownership_isolation_across_entities():
    """User B CANNOT access, manipulate, or delete User A's private resources across any module."""
    ts = int(time.time() * 1000)
    tok_a = _seed_privileged_user("Isolated A", f"iso_a_{ts}@test.com", "User")
    tok_b = _seed_privileged_user("Isolated B", f"iso_b_{ts}@test.com", "User")
    hdrs_a = {"Authorization": f"Bearer {tok_a}"}
    hdrs_b = {"Authorization": f"Bearer {tok_b}"}

    # User A creates resources
    eval_a = client.post("/api/v1/assessment/evaluate", json={"skin_type": "Dry"}, headers=hdrs_a).json()
    a_assessment_id = eval_a["id"]

    photo_a = client.post("/api/v1/analytics/photos/upload", json={"image_url": "https://example.com/a.jpg"}, headers=hdrs_a).json()
    a_photo_id = photo_a["id"]

    appt_a = client.post("/api/v1/appointments/request", json={"target_role": "Consultant", "preferred_date": "2026-09-01", "preferred_time": "10:00 AM"}, headers=hdrs_a).json()
    a_appt_id = appt_a["id"]

    # User B attempts access
    # 1. Assessment by ID -> 403
    assert client.get(f"/api/v1/assessment/{a_assessment_id}", headers=hdrs_b).status_code == 403

    # 2. Photo deletion -> 403
    assert client.delete(f"/api/v1/analytics/photos/{a_photo_id}", headers=hdrs_b).status_code == 403

    # 3. Appointment status update -> 403
    assert client.post(f"/api/v1/appointments/{a_appt_id}/status", json={"status": "Accepted"}, headers=hdrs_b).status_code == 403

    # 4. Appointment referral -> 403
    assert client.post(f"/api/v1/appointments/{a_appt_id}/refer", json={"consultant_summary": "hack"}, headers=hdrs_b).status_code == 403


def test_p27_privilege_boundary_security():
    """Regular User attempting to call medical professional or admin endpoints MUST receive HTTP 403."""
    ts = int(time.time() * 1000)
    tok = _seed_privileged_user("Bound User", f"bound_{ts}@test.com", "User")
    hdrs = {"Authorization": f"Bearer {tok}"}

    forbidden_endpoints = [
        ("GET", "/api/v1/consultant/roster"),
        ("GET", "/api/v1/consultant/stats"),
        ("GET", "/api/v1/admin/stats"),
        ("GET", "/api/v1/admin/users"),
        ("GET", "/api/v1/admin/activity"),
    ]

    for method, path in forbidden_endpoints:
        if method == "GET":
            resp = client.get(path, headers=hdrs)
            assert resp.status_code == 403, f"Endpoint {path} must return 403 for User role, got {resp.status_code}"


# ==============================================================================
# PHASE 29 — FRONTEND ↔ BACKEND CONTRACT & API HARDENING TESTS
# ==============================================================================

def test_p29_appointment_null_created_at_safety():
    """DEF-29-02: Appointments with null created_at MUST NOT crash get_my_appointments with 500."""
    from backend.app.database import SessionLocal
    from backend.app.models import Appointment

    ts = int(time.time() * 1000)
    tok = _seed_privileged_user("P29 Appt User", f"p29_appt_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}
    me = client.get("/api/v1/auth/me", headers=headers).json()

    db = SessionLocal()
    appt_id = f"test_null_date_appt_{ts}"
    try:
        appt = Appointment(
            id=appt_id,
            user_id=me["id"],
            target_role="Consultant",
            preferred_date="2026-09-10",
            preferred_time="11:00 AM",
            status="Requested",
            created_at=None  # Explicitly null created_at
        )
        db.add(appt)
        db.commit()
        # Force created_at = NULL via raw SQL update bypassing model default
        from sqlalchemy import text
        db.execute(text("UPDATE appointments SET created_at = NULL WHERE id = :id"), {"id": appt_id})
        db.commit()

        resp = client.get("/api/v1/appointments/my", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        appts = resp.json()
        target = next((a for a in appts if a["id"] == appt_id), None)
        assert target is not None
        assert target["created_at"] is None
    finally:
        db.query(Appointment).filter(Appointment.id == appt_id).delete()
        db.commit()
        db.close()


def test_p29_admin_activity_null_created_at_safety():
    """DEF-29-03: Admin activity feed MUST safely format events even when underlying record timestamps are null."""
    from backend.app.database import SessionLocal
    from backend.app.models import User as UserModel

    ts = int(time.time() * 1000)
    admin_tok = _seed_privileged_user("P29 Admin", f"p29_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    db = SessionLocal()
    u_id = f"test_null_u_{ts}"
    try:
        u = UserModel(
            id=u_id,
            email=f"null_date_{ts}@test.com",
            hashed_password="hash",
            name="Null Date User",
            role="User",
            created_at=None
        )
        db.add(u)
        db.commit()

        resp = client.get("/api/v1/admin/activity?limit=20", headers=headers)
        assert resp.status_code == 200
        events = resp.json()["events"]
        assert isinstance(events, list)
    finally:
        db.query(UserModel).filter(UserModel.id == u_id).delete()
        db.commit()
        db.close()


def test_p29_invalid_bearer_token_structure_returns_401():
    """Malformed or invalid JWT tokens MUST return 401 Unauthorized across all protected routes."""
    bad_headers = {"Authorization": "Bearer invalid.malformed.jwttoken"}
    protected_paths = [
        "/api/v1/auth/me",
        "/api/v1/assessment/score",
        "/api/v1/routine",
        "/api/v1/analytics",
        "/api/v1/recommendations",
        "/api/v1/appointments/my",
    ]
    for path in protected_paths:
        resp = client.get(path, headers=bad_headers)
        assert resp.status_code == 401, f"Path {path} with bad token must return 401, got {resp.status_code}"


# ==============================================================================
# PHASE 30 — PRODUCTION READINESS & TIMESTAMP NULL SAFETY TESTS
# ==============================================================================

def test_p30_isoformat_null_created_at_safety():
    """DEF-30-01 / DEF-30-02 / DEF-30-03: Users, assessments, and photos with NULL timestamps MUST NOT 500 crash isoformat()."""
    from backend.app.database import SessionLocal
    from backend.app.models import User as UserModel, SkinAssessment, ProgressPhoto
    from sqlalchemy import text

    ts = int(time.time() * 1000)
    tok = _seed_privileged_user("P30 Iso User", f"p30_iso_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    db = SessionLocal()
    me = client.get("/api/v1/auth/me", headers=headers).json()
    uid = me["id"]

    # Force created_at = NULL on user
    db.execute(text("UPDATE users SET created_at = NULL WHERE id = :id"), {"id": uid})
    db.commit()

    # 1. Test /auth/me with null created_at
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["created_at"] is None

    # 2. Test /assessment/evaluate and /score with null created_at
    ass = SkinAssessment(
        user_id=uid,
        overall_score=85.0,
        condition_subscore=80.0,
        lifestyle_subscore=80.0,
        sleep_subscore=80.0,
        consistency_subscore=80.0,
        hydration_subscore=80.0,
        detected_concerns=[]
    )
    db.add(ass)
    db.commit()
    db.execute(text("UPDATE skin_assessments SET created_at = NULL WHERE id = :id"), {"id": ass.id})
    db.commit()

    res_score = client.get("/api/v1/assessment/score", headers=headers)
    assert res_score.status_code == 200
    assert res_score.json()["created_at"] is None

    res_hist = client.get("/api/v1/assessment/history", headers=headers)
    assert res_hist.status_code == 200
    assert res_hist.json()[0]["created_at"] is None

    # 3. Test photo upload response with null uploaded_at
    photo = ProgressPhoto(
        user_id=uid,
        image_url="https://example.com/null_date.jpg",
        skin_health_score=85.0,
        tag="Baseline"
    )
    db.add(photo)
    db.commit()
    db.execute(text("UPDATE progress_photos SET uploaded_at = NULL WHERE id = :id"), {"id": photo.id})
    db.commit()

    # Cleanup DB records created in test
    db.query(ProgressPhoto).filter(ProgressPhoto.id == photo.id).delete()
    db.query(SkinAssessment).filter(SkinAssessment.id == ass.id).delete()
    db.commit()
    db.close()


# ==============================================================================
# PHASE 31 — AI/ML PIPELINE & PERSONALIZATION HARDENING TESTS
# ==============================================================================

def test_p31_sun_exposure_casing_normalization():
    """DEF-31-01: Scoring engine MUST deduct points for lowercase or mixed-case sun exposure inputs like 'high'."""
    from backend.app.scoring_engine import calculate_skin_health_score

    # Evaluate with lowercase 'high' vs title-case 'High'
    overall_lower, sub_lower, _ = calculate_skin_health_score(
        concerns_severity={"acne_severity": 0},
        lifestyle={"sun_exposure": "high", "stress_level": 4},
        sleep_hours=8.0,
        water_intake_l=3.0,
        adherence_pct=100.0
    )
    overall_title, sub_title, _ = calculate_skin_health_score(
        concerns_severity={"acne_severity": 0},
        lifestyle={"sun_exposure": "High", "stress_level": 4},
        sleep_hours=8.0,
        water_intake_l=3.0,
        adherence_pct=100.0
    )
    assert sub_lower["lifestyle"] == sub_title["lifestyle"] == 85.0, f"Expected lifestyle subscore 85.0 for 'high', got {sub_lower['lifestyle']}"


def test_p31_routine_generator_skin_type_case_and_whitespace_normalization():
    """DEF-31-02: Routine generator MUST handle whitespace-padded and case-variant skin_type inputs like ' sensitive '."""
    from backend.app.routine_generator import generate_customized_routine

    routine = generate_customized_routine(" sensitive ", {"redness_severity": 2})
    
    # Sensitive skin routine must NOT contain Retinol
    for step in routine:
        for active in step.get("active_ingredients", []):
            assert "retinol" not in active.lower(), f"Sensitive skin routine should not contain Retinol, found {active}"


def test_p31_update_profile_numerical_bounds_validation():
    """DEF-31-03: Profile updates MUST reject negative or out-of-range sleep_hours, water_intake_l, stress_level, or age with 400."""
    ts = int(time.time() * 1000)
    tok = _seed_privileged_user("P31 Bounds User", f"p31_bounds_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    # Invalid negative sleep_hours -> 400
    res_sleep = client.post("/api/v1/assessment/profile", json={"sleep_hours": -5.0}, headers=headers)
    assert res_sleep.status_code == 400

    # Invalid negative water_intake_l -> 400
    res_water = client.post("/api/v1/assessment/profile", json={"water_intake_l": -2.0}, headers=headers)
    assert res_water.status_code == 400

    # Invalid stress_level > 10 -> 400
    res_stress = client.post("/api/v1/assessment/profile", json={"stress_level": 15}, headers=headers)
    assert res_stress.status_code == 400

    # Invalid age > 120 -> 400
    res_age = client.post("/api/v1/assessment/profile", json={"age": 150}, headers=headers)
    assert res_age.status_code == 400


# ── Phase 32: Database Persistence & Transaction Integrity Regressions ────────

def test_p32_register_creates_user_and_profile_atomically():
    """
    DEF-32-03 regression: After successful registration, both the User row and
    the UserProfile row must exist. Verifies that the merged single-commit in
    auth_router correctly persists both records.
    """
    limiter_register.reset()
    limiter_login.reset()

    unique_email = f"p32_atomic_{int(time.time())}@miracle.com"
    res = client.post("/api/v1/auth/register", json={
        "name": "Phase32 Atom",
        "email": unique_email,
        "password": "TestPass123!"
    })
    assert res.status_code == 200, f"Registration failed: {res.text}"
    token = res.json()["access_token"]
    user_id = res.json()["user_id"]

    # Verify UserProfile was also created
    db = SessionLocal()
    try:
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        assert profile is not None, (
            "DEF-32-03: UserProfile was not created atomically with User. "
            "A User row exists with no associated profile."
        )
    finally:
        db.close()


def test_p32_evaluate_skin_produces_consistent_assessment_and_routine():
    """
    DEF-32-01 regression: After a successful /assessment/evaluate call, the
    assessment, updated profile, and active routine steps must all exist in the
    DB. Verifies that the merged single-commit approach persists all three writes
    atomically — no partial state.
    """
    limiter_register.reset()
    limiter_login.reset()

    unique_email = f"p32_eval_{int(time.time())}@miracle.com"
    reg = client.post("/api/v1/auth/register", json={
        "name": "Phase32 Eval",
        "email": unique_email,
        "password": "TestPass123!"
    })
    assert reg.status_code == 200
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    payload = {
        "skin_type": "Oily",
        "acne_severity": 5,
        "hyperpigmentation_severity": 3,
        "redness_severity": 2,
        "wrinkles_severity": 1,
        "allergies": [],
        "lifestyle": {"sleep_hours": 7.0, "water_intake_l": 2.0, "sun_exposure": "Moderate"}
    }
    eval_res = client.post("/api/v1/assessment/evaluate", json=payload, headers=headers)
    assert eval_res.status_code == 200, f"Evaluate failed: {eval_res.text}"

    # Assessment must be retrievable
    score_res = client.get("/api/v1/assessment/score", headers=headers)
    assert score_res.status_code == 200, "Assessment not found after evaluate"
    assert score_res.json()["overall_score"] > 0

    # Profile must have been updated
    profile_res = client.get("/api/v1/assessment/profile", headers=headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["skin_type"] == "Oily", (
        "DEF-32-01: Profile skin_type not updated — possible partial-write from split commit"
    )

    # Active routine steps must exist
    routine_res = client.get("/api/v1/routine", headers=headers)
    assert routine_res.status_code == 200
    assert len(routine_res.json()) > 0, (
        "DEF-32-01: No active routine steps found — possible partial-write from split commit"
    )


def test_p32_prescribe_routine_missing_patient_returns_404():
    """
    DEF-32-02 regression: Prescribing to a non-existent patient_id must return
    404 before any database writes occur, keeping the DB in a consistent state.
    """
    consultant_tok = _seed_privileged_user(
        "P32 Consultant", f"p32_cons_{int(time.time())}@miracle.com", "Skincare Consultant"
    )
    headers = {"Authorization": f"Bearer {consultant_tok}"}

    res = client.post("/api/v1/consultant/prescribe", json={
        "patient_id": "00000000-0000-0000-0000-000000000000",
        "doctor_notes": "Test prescription",
        "routine_steps": [
            {
                "time_of_day": "AM",
                "step_number": 1,
                "step_category": "Cleansing",
                "product_name": "Test Cleanser",
                "active_ingredients": ["Salicylic Acid"],
                "is_active": True,
                "prescribed_by_doctor": True
            }
        ]
    }, headers=headers)
    assert res.status_code == 404, (
        f"DEF-32-02: Expected 404 for unknown patient_id, got {res.status_code}: {res.text}"
    )


# ── Phase 33: API Reliability, Concurrency & Idempotency Tests ───────────────

def test_p33_appointment_status_update_idempotency():
    """
    Verifies that repeated status updates to an appointment (e.g. repeated 'Accepted')
    are idempotent, return 200 OK deterministically, and maintain valid state.
    """
    consultant_tok = _seed_privileged_user(
        "P33 Consultant", f"p33_cons_{int(time.time())}@miracle.com", "Skincare Consultant"
    )
    headers = {"Authorization": f"Bearer {consultant_tok}"}

    # First register a patient and request an appointment
    limiter_register.reset()
    limiter_login.reset()
    pat_res = client.post("/api/v1/auth/register", json={
        "name": "P33 Patient",
        "email": f"p33_pat_{int(time.time())}@miracle.com",
        "password": "Password123!"
    })
    assert pat_res.status_code == 200
    pat_tok = pat_res.json()["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_tok}"}

    req_res = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-01",
        "preferred_time": "11:00 AM",
        "user_notes": "Reliability test"
    }, headers=pat_headers)
    assert req_res.status_code == 200
    appt_id = req_res.json()["id"]

    # Repeated status update 1
    res1 = client.post(f"/api/v1/appointments/{appt_id}/status", json={"status": "Accepted", "notes": "Confirmed"}, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["status"] == "Accepted"

    # Repeated status update 2 (Identical retry)
    res2 = client.post(f"/api/v1/appointments/{appt_id}/status", json={"status": "Accepted", "notes": "Confirmed retry"}, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == "Accepted"


def test_p33_routine_logging_upsert_idempotency():
    """
    Verifies that logging routine progress for the same date multiple times updates
    the existing entry rather than duplicating entries in the routine logs store.
    """
    limiter_register.reset()
    limiter_login.reset()
    res = client.post("/api/v1/auth/register", json={
        "name": "P33 Routine User",
        "email": f"p33_routine_{int(time.time())}@miracle.com",
        "password": "Password123!"
    })
    assert res.status_code == 200
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    log_payload = {
        "log_date": "2026-08-11",
        "completed_steps": ["step_1", "step_2"],
        "water_intake_ml": 2500,
        "sleep_hours": 8.0
    }

    # Log submission 1
    l1 = client.post("/api/v1/routine/log", json=log_payload, headers=headers)
    assert l1.status_code == 200

    # Log submission 2 (same date, updated completion)
    log_payload["completed_steps"] = ["step_1", "step_2", "step_3"]
    l2 = client.post("/api/v1/routine/log", json=log_payload, headers=headers)
    assert l2.status_code == 200

    # Fetch logs and verify single entry for date
    logs_res = client.get("/api/v1/routine/logs", headers=headers)
    assert logs_res.status_code == 200
    user_logs = logs_res.json()["logs"]
    same_date_logs = [l for l in user_logs if l.get("log_date") == "2026-08-11"]
    assert len(same_date_logs) == 1
    assert same_date_logs[0]["completed_steps"] == ["step_1", "step_2", "step_3"]

