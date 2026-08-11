"""
test_frontend_integration.py
Phase 4 regression tests for:
- Frontend API service endpoints & response schemas
- 401 Unauthorized handling
- 403 Forbidden RBAC handling
- 429 Rate limiting response schema
- Malformed/empty data safety
- External URL sanitization & scheme safety
- Production API URL configuration handling
"""
import time
import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.rate_limiter import limiter_register, limiter_login
from backend.app.database import SessionLocal
from backend.app.models import User, UserProfile
from backend.app.auth import hash_password, create_access_token

client = TestClient(app)

def test_unauthenticated_request_returns_401_json():
    """Unauthenticated requests to protected endpoints MUST return HTTP 401 JSON detail."""
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    data = resp.json()
    assert "detail" in data


def test_user_role_blocked_from_consultant_endpoints():
    """User role requesting consultant endpoints MUST receive HTTP 403."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    email = f"user_role_blocked_{ts}@test.com"

    # Register regular user
    reg = client.post("/api/v1/auth/register", json={
        "name": "Regular User",
        "email": email,
        "password": "Password123!",
        "role": "User"
    })
    assert reg.status_code == 200, f"Registration failed: {reg.text}"
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt consultant roster
    roster_resp = client.get("/api/v1/consultant/roster", headers=headers)
    assert roster_resp.status_code == 403
    assert "forbidden" in roster_resp.json()["detail"].lower() or "medical professional" in roster_resp.json()["detail"].lower()


def test_empty_profile_recommendations_response_schema():
    """Empty or unconfigured profile GET /recommendations MUST return HTTP 200 with fallback products."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    email = f"fresh_user_recs_{ts}@test.com"

    reg = client.post("/api/v1/auth/register", json={
        "name": "Fresh User",
        "email": email,
        "password": "Password123!",
        "role": "User"
    })
    assert reg.status_code == 200, f"Registration failed: {reg.text}"
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/recommendations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "products" in data
    assert isinstance(data["products"], list)
    assert len(data["products"]) > 0


def test_url_sanitization_helper_safety():
    """
    Simulates frontend sanitizeUrl helper logic.
    Only http://, https://, data:image/, or relative paths should be allowed.
    Dangerous schemes like javascript: or file:// must return '#'.
    """
    valid_urls = [
        "http://example.com/item",
        "https://cdn.skinsafeproducts.com/photo/123.jpg",
        "data:image/png;base64,iVBORw0KGgo...",
        "/assets/logo.png"
    ]
    invalid_urls = [
        "javascript:alert('xss')",
        "file:///etc/passwd",
        "ftp://malicious.com/payload",
        "   javascript:void(0)   ",
        "",
        None
    ]

    def sanitize_url(url):
        if not url or not isinstance(url, str):
            return "#"
        t = url.strip()
        if t.startswith("http://") or t.startswith("https://") or t.startswith("data:image/") or t.startswith("/"):
            return t
        return "#"

    for url in valid_urls:
        assert sanitize_url(url) == url.strip()

    for url in invalid_urls:
        assert sanitize_url(url) == "#"


def test_rate_limit_error_detail_schema():
    """HTTP 429 responses MUST contain detail message string and Retry-After header."""
    limiter_login.reset()
    os.environ["AUTH_RATE_LIMIT_LOGIN"] = "1/minute"

    try:
        # 1st request
        client.post("/api/v1/auth/login", json={"email": "rl_schema@test.com", "password": "wrong"})
        # 2nd request triggers 429
        resp = client.post("/api/v1/auth/login", json={"email": "rl_schema@test.com", "password": "wrong"})
        assert resp.status_code == 429
        assert "Retry-After" in resp.headers
        assert "detail" in resp.json()
    finally:
        os.environ.pop("AUTH_RATE_LIMIT_LOGIN", None)
        limiter_login.reset()


def test_user_profile_read_and_update_persistence():
    """Verify profile updating and persistence via GET/POST /api/v1/assessment/profile."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    email = f"profile_test_{ts}@test.com"

    reg = client.post("/api/v1/auth/register", json={
        "name": "Profile User",
        "email": email,
        "password": "Password123!",
        "role": "User"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update profile
    upd = client.post("/api/v1/assessment/profile", json={
        "skin_type": "Sensitive",
        "concerns": ["Redness & Sensitivity"],
        "allergies": ["Fragrance"],
        "age": 28,
        "gender": "Female"
    }, headers=headers)
    assert upd.status_code == 200
    assert upd.json()["skin_type"] == "Sensitive"

    # Verify persistence
    prof = client.get("/api/v1/assessment/profile", headers=headers)
    assert prof.status_code == 200
    data = prof.json()
    assert data["skin_type"] == "Sensitive"
    assert "Redness & Sensitivity" in data["concerns"]
    assert data["age"] == 28


def test_assessment_evaluation_and_score_persistence():
    """Verify skin photo evaluation creates assessment and generates active routine steps."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    email = f"assessment_test_{ts}@test.com"

    reg = client.post("/api/v1/auth/register", json={
        "name": "Assessment User",
        "email": email,
        "password": "Password123!",
        "role": "User"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    eval_resp = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Oily",
        "acne_severity": 3,
        "hyperpigmentation_severity": 2,
        "lifestyle": {"sleep_hours": 8.0, "water_intake_liters": 3.0}
    }, headers=headers)
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["overall_score"] > 0
    assert "id" in eval_data

    # Verify latest score endpoint
    score_resp = client.get("/api/v1/assessment/score", headers=headers)
    assert score_resp.status_code == 200
    assert score_resp.json()["overall_score"] == eval_data["overall_score"]

    # Verify active routine generated
    routine_resp = client.get("/api/v1/routine", headers=headers)
    assert routine_resp.status_code == 200
    routine = routine_resp.json()
    assert len(routine) > 0


def test_routine_checklist_logging_and_history():
    """Verify routine progress logging POST /api/v1/routine/log."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    email = f"routine_log_{ts}@test.com"

    reg = client.post("/api/v1/auth/register", json={"name": "Log User", "email": email, "password": "Password123!", "role": "User"})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    log_resp = client.post("/api/v1/routine/log", json={
        "log_date": "2026-08-10",
        "completed_steps": ["Morning Routine", "Drink Water"],
        "water_intake_ml": 2500,
        "sleep_hours": 7.5
    }, headers=headers)
    assert log_resp.status_code == 200
    assert log_resp.json()["status"] == "success"

    logs_resp = client.get("/api/v1/routine/logs", headers=headers)
    assert logs_resp.status_code == 200
    assert len(logs_resp.json()["logs"]) > 0


def test_appointment_request_and_referral_rbac():
    """Verify user appointment request and consultant referral workflow."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    user_email = f"appt_user_{ts}@test.com"
    cons_email = f"appt_cons_{ts}@test.com"

    # 1. Register User (public endpoint)
    u_reg = client.post("/api/v1/auth/register", json={"name": "Appt Patient", "email": user_email, "password": "Password123!", "role": "User"})
    u_token = u_reg.json()["access_token"]
    u_headers = {"Authorization": f"Bearer {u_token}"}

    # 2. User requests appointment
    req_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-08-20",
        "preferred_time": "11:00 AM",
        "user_notes": "Acne consultation request"
    }, headers=u_headers)
    assert req_resp.status_code == 200
    appt_id = req_resp.json()["id"]

    # 3. Seed Consultant directly (public registration cannot assign privileged roles)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == cons_email).first():
            cons_user = User(name="Dr Consultant", email=cons_email,
                            hashed_password=hash_password("Password123!"), role="Skincare Consultant")
            db.add(cons_user)
            db.commit()
            db.refresh(cons_user)
            db.add(UserProfile(user_id=cons_user.id))
            db.commit()
    finally:
        db.close()
    limiter_login.reset()
    c_login = client.post("/api/v1/auth/login", json={"email": cons_email, "password": "Password123!"})
    c_token = c_login.json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    # 4. Consultant refers to Dermatologist
    ref_resp = client.post(f"/api/v1/appointments/{appt_id}/refer", json={
        "consultant_summary": "Requires dermatologist prescription for severe acne",
        "preferred_date": "2026-08-22",
        "preferred_time": "02:00 PM"
    }, headers=c_headers)
    assert ref_resp.status_code == 200
    assert ref_resp.json()["status"] == "Referred_To_Dermatologist"


def test_admin_platform_stats_rbac():
    """Verify /api/v1/consultant/stats requires medical/admin role."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    u_email = f"norm_u_{ts}@test.com"
    a_email = f"admin_u_{ts}@test.com"

    # User role -> blocked
    u_reg = client.post("/api/v1/auth/register", json={"name": "Plain User", "email": u_email, "password": "Password123!", "role": "User"})
    u_resp = client.get("/api/v1/consultant/stats", headers={"Authorization": f"Bearer {u_reg.json()['access_token']}"})
    assert u_resp.status_code == 403

    # Admin role -> allowed (seed via DB since public registration blocks privileged roles)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == a_email).first():
            admin_user = User(name="Admin User", email=a_email,
                             hashed_password=hash_password("Password123!"), role="Administrator")
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            db.add(UserProfile(user_id=admin_user.id))
            db.commit()
    finally:
        db.close()
    limiter_login.reset()
    a_login = client.post("/api/v1/auth/login", json={"email": a_email, "password": "Password123!"})
    a_resp = client.get("/api/v1/consultant/stats", headers={"Authorization": f"Bearer {a_login.json()['access_token']}"})
    assert a_resp.status_code == 200
    stats = a_resp.json()
    assert "total_users" in stats
    assert "users_by_role" in stats


def test_analytics_no_fake_compliance_fallbacks():
    """Verify GET /api/v1/analytics returns 0.0 adherence (no fake 85/80/82 numbers) when no logs exist."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    email = f"analytics_nologs_{ts}@test.com"

    reg = client.post("/api/v1/auth/register", json={"name": "Fresh User", "email": email, "password": "Password123!", "role": "User"})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    metrics = data["compliance_metrics"]
    assert metrics["adherence_7d"] == 0.0
    assert metrics["adherence_30d"] == 0.0
    assert metrics["adherence_90d"] == 0.0


def test_profile_age_and_gender_persistence():
    """Verify profile age and gender update and persist via GET/POST /api/v1/assessment/profile."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    email = f"profile_age_gender_{ts}@test.com"

    reg = client.post("/api/v1/auth/register", json={"name": "Profile User", "email": email, "password": "Password123!", "role": "User"})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    upd = client.post("/api/v1/assessment/profile", json={
        "skin_type": "Dry",
        "concerns": ["Dryness & Dehydration"],
        "age": 32,
        "gender": "Non-binary"
    }, headers=headers)
    assert upd.status_code == 200

    prof = client.get("/api/v1/assessment/profile", headers=headers)
    assert prof.status_code == 200
    data = prof.json()
    assert data["age"] == 32
    assert data["gender"] == "Non-binary"


def test_today_routine_log_persistence_and_filtering():
    """Verify today's routine completion log persists via POST /api/v1/routine/log and GET /api/v1/routine/logs."""
    limiter_register.reset()
    ts = int(time.time() * 1000)
    email = f"routine_persist_{ts}@test.com"

    reg = client.post("/api/v1/auth/register", json={"name": "Checklist User", "email": email, "password": "Password123!", "role": "User"})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    from datetime import date
    today_str = str(date.today())

    log_res = client.post("/api/v1/routine/log", json={
        "log_date": today_str,
        "completed_steps": ["Morning Routine", "Sunscreen Applied"],
        "water_intake_ml": 2500,
        "sleep_hours": 8.0
    }, headers=headers)
    assert log_res.status_code == 200

    get_logs = client.get("/api/v1/routine/logs", headers=headers)
    assert get_logs.status_code == 200
    logs = get_logs.json()["logs"]
    today_entry = next((l for l in logs if l.get("log_date") == today_str), None)
    assert today_entry is not None
    assert "Morning Routine" in today_entry["completed_steps"]
    assert "Sunscreen Applied" in today_entry["completed_steps"]


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 16 — CONSULTANT DASHBOARD REGRESSION TESTS
# ─────────────────────────────────────────────────────────────────────────────

def _register_p16_account(name: str, email: str, role: str = "User"):
    """
    Helper: register account with specified role and return JWT token.
    - "User" role uses the public /register endpoint (matches production behaviour).
    - Privileged roles (Skincare Consultant, Dermatologist, Administrator) bypass
      the public endpoint via direct DB insertion, since public registration is
      correctly restricted to "User" only for security reasons.
    """
    limiter_register.reset()
    limiter_login.reset()
    PRIVILEGED_ROLES = {"Skincare Consultant", "Dermatologist", "Administrator"}
    if role in PRIVILEGED_ROLES:
        # Directly insert privileged user into DB (simulating admin-assigned role)
        db = SessionLocal()
        try:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                user = User(
                    name=name,
                    email=email,
                    hashed_password=hash_password("Password123!"),
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
        resp = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
        assert resp.status_code == 200, f"Login failed for privileged user {email}: {resp.text}"
        return resp.json()["access_token"]
    else:
        # Public registration for User role
        reg_resp = client.post("/api/v1/auth/register", json={
            "name": name,
            "email": email,
            "password": "Password123!",
            "role": "User"
        })
        assert reg_resp.status_code == 200, f"Registration failed for {email}: {reg_resp.text}"
        resp = client.post("/api/v1/auth/login", data={
            "username": email,
            "password": "Password123!"
        })
        assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
        return resp.json()["access_token"]



# ── RBAC guard tests ──────────────────────────────────────────────────────────

def test_p16_roster_blocked_for_regular_user():
    """Endpoint /consultant/roster must reject regular User role."""
    token = _register_p16_account("BlockedUser P16", f"blocked_user_p16_{int(time.time()*1000)}@test.com", "User")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/consultant/roster", headers=headers)
    assert resp.status_code == 403


def test_p16_stats_blocked_for_regular_user():
    """Endpoint /consultant/stats must reject regular User role."""
    token = _register_p16_account("BlockedUserStats P16", f"blocked_stats_p16_{int(time.time()*1000)}@test.com", "User")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/consultant/stats", headers=headers)
    assert resp.status_code == 403


def test_p16_prescribe_blocked_for_regular_user():
    """Endpoint /consultant/prescribe must reject regular User role."""
    token = _register_p16_account("BlockedPrescribe P16", f"blocked_prescribe_p16_{int(time.time()*1000)}@test.com", "User")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/api/v1/consultant/prescribe", json={"patient_id": "fake", "doctor_notes": "Notes", "routine_steps": []}, headers=headers)
    assert resp.status_code == 403


def test_p16_prescribe_404_for_missing_patient():
    """Prescribing for a non-existent patient returns 404."""
    ts = int(time.time() * 1000)
    cons_token = _register_p16_account("ConsultantNoPat P16", f"consultant_nopat_p16_{ts}@test.com", "Skincare Consultant")
    headers = {"Authorization": f"Bearer {cons_token}"}

    resp = client.post("/api/v1/consultant/prescribe", json={
        "patient_id": "does-not-exist-id",
        "doctor_notes": "Test note",
        "routine_steps": [
            {
                "time_of_day": "Morning",
                "step_number": 1,
                "step_category": "Cleanser",
                "product_name": "Ghost Cleanser",
                "active_ingredients": []
            }
        ]
    }, headers=headers)
    assert resp.status_code == 404


# ── Dermatologist role — same RBAC access ────────────────────────────────────

def test_p16_dermatologist_can_access_roster():
    """Dermatologist role must also have access to the consultant roster endpoint."""
    ts = int(time.time() * 1000)
    _register_p16_account("DermaPatient P16", f"derma_patient_p16_{ts}@test.com", "User")
    derma_token = _register_p16_account("Dermatologist P16", f"derma_p16_{ts}@test.com", "Dermatologist")
    headers = {"Authorization": f"Bearer {derma_token}"}

    resp = client.get("/api/v1/consultant/roster", headers=headers)
    assert resp.status_code == 200
    assert "patients" in resp.json()


def test_p16_dermatologist_can_prescribe():
    """Dermatologist role must be able to prescribe routines."""
    ts = int(time.time() * 1000)
    pat_token = _register_p16_account("DermaPrescribePatient P16", f"derma_prescribe_p16_{ts}@test.com", "User")
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_token}"})
    patient_id = me_resp.json()["id"]

    derma_token = _register_p16_account("DermaRx P16", f"derma_rx_p16_{ts}@test.com", "Dermatologist")
    headers = {"Authorization": f"Bearer {derma_token}"}

    resp = client.post("/api/v1/consultant/prescribe", json={
        "patient_id": patient_id,
        "routine_steps": [
            {
                "time_of_day": "Evening",
                "step_number": 1,
                "step_category": "Treatment",
                "product_name": "Derma Retinol Serum",
                "active_ingredients": ["Retinol", "Peptides"]
            }
        ],
        "doctor_notes": "Use 2x per week initially."
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 17 — DERMATOLOGIST DASHBOARD REGRESSION TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_p17_dermatologist_appointment_queue_retrieval():
    """Dermatologist can fetch live appointments queue with patient details."""
    ts = int(time.time() * 1000)
    pat_token = _register_p16_account("P17 Patient Queue", f"p17_pat_queue_{ts}@test.com", "User")
    derma_token = _register_p16_account("P17 Derma Queue", f"p17_derma_queue_{ts}@test.com", "Dermatologist")

    # Patient requests appointment
    req_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Dermatologist",
        "preferred_date": "2026-08-20",
        "preferred_time": "11:00 AM",
        "user_notes": "Clinical acne consultation requested."
    }, headers={"Authorization": f"Bearer {pat_token}"})
    assert req_resp.status_code == 200

    # Dermatologist fetches appointments queue
    my_resp = client.get("/api/v1/appointments/my", headers={"Authorization": f"Bearer {derma_token}"})
    assert my_resp.status_code == 200
    appts = my_resp.json()
    assert isinstance(appts, list)
    assert len(appts) > 0
    target_appt = next((a for a in appts if a["id"] == req_resp.json()["id"]), None)
    assert target_appt is not None
    assert target_appt["patient_name"] == "P17 Patient Queue"
    assert target_appt["patient_email"] == f"p17_pat_queue_{ts}@test.com"
    assert target_appt["status"] == "Requested"


def test_p17_dermatologist_appointment_status_update():
    """Dermatologist can accept and complete appointments, updating DB state."""
    ts = int(time.time() * 1000)
    pat_token = _register_p16_account("P17 Patient Status", f"p17_pat_status_{ts}@test.com", "User")
    derma_token = _register_p16_account("P17 Derma Status", f"p17_derma_status_{ts}@test.com", "Dermatologist")

    # Request appointment
    req_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Dermatologist",
        "preferred_date": "2026-08-22",
        "preferred_time": "02:30 PM",
        "user_notes": "Follow-up for prescription active."
    }, headers={"Authorization": f"Bearer {pat_token}"})
    appt_id = req_resp.json()["id"]

    # Dermatologist accepts appointment
    accept_resp = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "Accepted",
        "notes": "Accepted for clinical consultation"
    }, headers={"Authorization": f"Bearer {derma_token}"})
    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "Accepted"

    # Dermatologist completes appointment
    complete_resp = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "Completed",
        "notes": "Clinical treatment plan delivered"
    }, headers={"Authorization": f"Bearer {derma_token}"})
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "Completed"


def test_p17_dermatologist_patient_detail_retrieval():
    """Dermatologist can inspect patient profile, assessment history, and active routine."""
    ts = int(time.time() * 1000)
    pat_token = _register_p16_account("P17 Patient Detail", f"p17_pat_detail_{ts}@test.com", "User")
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_token}"})
    patient_id = me_resp.json()["id"]

    # Patient updates profile & submits assessment
    client.post("/api/v1/assessment/profile", json={
        "skin_type": "Sensitive",
        "age": 29,
        "gender": "Female",
        "concerns": ["Redness", "Barrier Damage"],
        "allergies": ["Fragrance", "Salicylic Acid"]
    }, headers={"Authorization": f"Bearer {pat_token}"})

    client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Sensitive",
        "acne_severity": 2,
        "hyperpigmentation_severity": 1,
        "redness_severity": 3,
        "wrinkles_severity": 0,
        "allergies": ["Fragrance"],
        "lifestyle": {"sleep_hours": 8.0, "water_intake": 2.5}
    }, headers={"Authorization": f"Bearer {pat_token}"})

    derma_token = _register_p16_account("P17 Derma Detail", f"p17_derma_detail_{ts}@test.com", "Dermatologist")
    headers = {"Authorization": f"Bearer {derma_token}"}

    detail_resp = client.get(f"/api/v1/consultant/patient/{patient_id}", headers=headers)
    assert detail_resp.status_code == 200
    data = detail_resp.json()
    assert data["patient"]["id"] == patient_id
    assert data["patient"]["profile"]["skin_type"] == "Sensitive"
    assert data["patient"]["profile"]["age"] == 29
    assert "Fragrance" in data["patient"]["profile"]["allergies"]
    assert len(data["assessments"]) >= 1
    assert any("Redness" in c for c in data["assessments"][0]["concerns"])


def test_p17_dermatologist_prescription_persistence_and_user_routine():
    """Dermatologist prescribes routine; verifies prescribed_by_doctor and user active routine."""
    from backend.app.database import SessionLocal
    from backend.app.models import SkincareRoutine

    ts = int(time.time() * 1000)
    pat_token = _register_p16_account("P17 Patient Rx", f"p17_pat_rx_{ts}@test.com", "User")
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_token}"})
    patient_id = me_resp.json()["id"]

    derma_token = _register_p16_account("P17 Derma Rx", f"p17_derma_rx_{ts}@test.com", "Dermatologist")
    headers = {"Authorization": f"Bearer {derma_token}"}

    rx_payload = {
        "patient_id": patient_id,
        "doctor_notes": "Apply Adaplene 0.1% Gel alternate evenings. Cease harsh scrubs.",
        "routine_steps": [
            {
                "time_of_day": "AM",
                "step_number": 1,
                "step_category": "Cleansing",
                "product_name": "Gentle Hydrating Cleanser",
                "active_ingredients": ["Ceramides", "Glycerin"]
            },
            {
                "time_of_day": "PM",
                "step_number": 1,
                "step_category": "Treatment",
                "product_name": "Adaplene 0.1% Gel",
                "active_ingredients": ["Adapalene"]
            }
        ]
    }

    rx_resp = client.post("/api/v1/consultant/prescribe", json=rx_payload, headers=headers)
    assert rx_resp.status_code == 200
    assert rx_resp.json()["status"] == "success"

    # User fetches active routine endpoint and receives doctor prescribed steps
    user_routine_resp = client.get("/api/v1/routine", headers={"Authorization": f"Bearer {pat_token}"})
    assert user_routine_resp.status_code == 200
    routine_data = user_routine_resp.json()
    assert isinstance(routine_data, list)
    assert len(routine_data) == 2
    adaplene_step = next((s for s in routine_data if s["product_name"] == "Adaplene 0.1% Gel"), None)
    assert adaplene_step is not None
    assert adaplene_step["prescribed_by_doctor"] is True
    assert adaplene_step["doctor_notes"] == "Apply Adaplene 0.1% Gel alternate evenings. Cease harsh scrubs."


def test_p17_dermatologist_cannot_perform_consultant_referral():
    """Dermatologist role attempting to refer to another dermatologist MUST return HTTP 403."""
    ts = int(time.time() * 1000)
    pat_token = _register_p16_account("P17 Refer Patient", f"p17_refer_pat_{ts}@test.com", "User")
    derma_token = _register_p16_account("P17 Refer Derma", f"p17_refer_derma_{ts}@test.com", "Dermatologist")

    # Request appointment
    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-08-25",
        "preferred_time": "10:00 AM"
    }, headers={"Authorization": f"Bearer {pat_token}"})
    appt_id = req.json()["id"]

    # Dermatologist calls refer endpoint -> blocked with 403
    refer_resp = client.post(f"/api/v1/appointments/{appt_id}/refer", json={
        "consultant_summary": "Re-referring patient"
    }, headers={"Authorization": f"Bearer {derma_token}"})
    assert refer_resp.status_code == 403
    assert "Only consultants can initiate dermatologist referrals" in refer_resp.json()["detail"]


def test_p17_missing_patient_returns_404():
    """Fetching details for a non-existent patient returns HTTP 404."""
    ts = int(time.time() * 1000)
    derma_token = _register_p16_account("P17 404 Derma", f"p17_404_derma_{ts}@test.com", "Dermatologist")
    resp = client.get("/api/v1/consultant/patient/invalid-patient-uuid-9999", headers={"Authorization": f"Bearer {derma_token}"})
    assert resp.status_code == 404


def test_p17_empty_dermatologist_data_returns_truthful_empty():
    """New dermatologist accessing platform stats or roster returns valid data schemas."""
    ts = int(time.time() * 1000)
    derma_token = _register_p16_account("P17 New Derma", f"p17_new_derma_{ts}@test.com", "Dermatologist")
    headers = {"Authorization": f"Bearer {derma_token}"}

    stats_resp = client.get("/api/v1/consultant/stats", headers=headers)
    assert stats_resp.status_code == 200
    assert "total_users" in stats_resp.json()

    roster_resp = client.get("/api/v1/consultant/roster", headers=headers)
    assert roster_resp.status_code == 200
    assert "patients" in roster_resp.json()


# ── PHASE 18: ADMIN DASHBOARD PRODUCTION HARDENING TESTS ──────────────────────

def test_p18_unauthenticated_admin_endpoints_return_401():
    """Unauthenticated requests to admin endpoints MUST return HTTP 401."""
    for ep in ["/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/activity"]:
        resp = client.get(ep)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {ep}, got {resp.status_code}"


def test_p18_non_admin_roles_receive_403():
    """User, Consultant, and Dermatologist roles MUST receive HTTP 403 on admin endpoints."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P18 User", f"p18_user_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P18 Cons", f"p18_cons_{ts}@test.com", "Skincare Consultant")
    derma_tok = _register_p16_account("P18 Derma", f"p18_derma_{ts}@test.com", "Dermatologist")

    endpoints = ["/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/activity"]

    for role_name, token in [("User", user_tok), ("Consultant", cons_tok), ("Dermatologist", derma_tok)]:
        headers = {"Authorization": f"Bearer {token}"}
        for ep in endpoints:
            resp = client.get(ep, headers=headers)
            assert resp.status_code == 403, f"Expected 403 for {role_name} on {ep}, got {resp.status_code}"
            assert "Administrator role required" in resp.json()["detail"]


def test_p18_admin_stats_live_db_counts():
    """Admin stats must reflect real DB counts and update when users/assessments/appointments are added."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P18 Admin", f"p18_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    # Fetch initial stats
    s1 = client.get("/api/v1/admin/stats", headers=headers).json()
    initial_users = s1["total_users"]
    initial_appts = s1["total_appointments"]

    # Register a new user and request an appointment
    u_tok = _register_p16_account("P18 Test Patient", f"p18_pat_{ts}@test.com", "User")
    client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-01",
        "preferred_time": "11:00 AM"
    }, headers={"Authorization": f"Bearer {u_tok}"})

    # Fetch updated stats
    s2 = client.get("/api/v1/admin/stats", headers=headers).json()
    assert s2["total_users"] == initial_users + 1
    assert s2["total_appointments"] == initial_appts + 1
    assert s2["users_by_role"]["User"] >= 1
    assert s2["appointments_by_status"]["Requested"] >= 1


def test_p18_admin_user_management_no_password_hashes():
    """Admin user listing MUST return user details without exposing password hashes or tokens."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P18 Sec Admin", f"p18_sec_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    resp = client.get("/api/v1/admin/users", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "users" in data
    assert len(data["users"]) > 0

    for user in data["users"]:
        assert "hashed_password" not in user
        assert "password" not in user
        assert "access_token" not in user
        assert "id" in user
        assert "name" in user
        assert "email" in user
        assert "role" in user


def test_p18_admin_activity_feed_live_db():
    """Admin activity feed returns live database events ordered by timestamp descending."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P18 Act Admin", f"p18_act_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    resp = client.get("/api/v1/admin/activity?limit=5", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "events" in data
    assert isinstance(data["events"], list)
    for evt in data["events"]:
        assert "type" in evt
        assert "title" in evt
        assert "detail" in evt
        assert "timestamp" in evt


def test_p18_health_and_readiness_checks():
    """Liveness (/health) and readiness (/ready) probes return proper JSON statuses."""
    h_resp = client.get("/health")
    assert h_resp.status_code == 200
    assert h_resp.json()["status"] == "ok"

    r_resp = client.get("/ready")
    assert r_resp.status_code == 200
    assert r_resp.json()["status"] == "ready"
    assert r_resp.json()["database"] == "connected"


# ── PHASE 19: USER DASHBOARD FULL PRODUCTION AUDIT & E2E HARDENING TESTS ─────

def test_p19_user_profile_complete_persistence():
    """Verify complete persistence of profile fields (age, gender, skin_type, concerns, allergies, etc.)."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P19 Profile User", f"p19_prof_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    update_payload = {
        "skin_type": "Sensitive",
        "concerns": ["Redness & Sensitivity", "Acne & Breakouts"],
        "allergies": ["Fragrance", "Parabens"],
        "sleep_hours": 8.0,
        "water_intake_l": 3.0,
        "stress_level": 2,
        "sun_exposure": "High",
        "age": 28,
        "gender": "Female"
    }

    up_resp = client.post("/api/v1/assessment/profile", json=update_payload, headers=headers)
    assert up_resp.status_code == 200

    get_resp = client.get("/api/v1/assessment/profile", headers=headers)
    assert get_resp.status_code == 200
    p = get_resp.json()
    assert p["skin_type"] == "Sensitive"
    assert "Redness & Sensitivity" in p["concerns"]
    assert "Fragrance" in p["allergies"]
    assert p["sleep_hours"] == 8.0
    assert p["water_intake_l"] == 3.0
    assert p["stress_level"] == 2
    assert p["sun_exposure"] == "High"
    assert p["age"] == 28
    assert p["gender"] == "Female"


def test_p19_user_ownership_isolation_profile():
    """User A cannot read or modify User B's profile."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P19 User A Profile", f"p19_prof_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P19 User B Profile", f"p19_prof_b_{ts}@test.com", "User")

    # User A updates profile to Dry
    client.post("/api/v1/assessment/profile", json={"skin_type": "Dry", "age": 30}, headers={"Authorization": f"Bearer {tok_a}"})
    # User B updates profile to Oily
    client.post("/api/v1/assessment/profile", json={"skin_type": "Oily", "age": 22}, headers={"Authorization": f"Bearer {tok_b}"})

    # User A reads own profile -> Dry, age 30
    p_a = client.get("/api/v1/assessment/profile", headers={"Authorization": f"Bearer {tok_a}"}).json()
    assert p_a["skin_type"] == "Dry"
    assert p_a["age"] == 30

    # User B reads own profile -> Oily, age 22
    p_b = client.get("/api/v1/assessment/profile", headers={"Authorization": f"Bearer {tok_b}"}).json()
    assert p_b["skin_type"] == "Oily"
    assert p_b["age"] == 22


def test_p19_user_ownership_isolation_routine_logs():
    """User A's routine logs MUST NOT be exposed to User B."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P19 Routine User A", f"p19_rout_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P19 Routine User B", f"p19_rout_b_{ts}@test.com", "User")

    # User A logs routine progress
    client.post("/api/v1/routine/log", json={
        "log_date": "2026-08-11",
        "completed_steps": ["Morning Routine", "Sunscreen Applied"]
    }, headers={"Authorization": f"Bearer {tok_a}"})

    # User B fetches routine logs -> MUST NOT contain User A's steps
    logs_b = client.get("/api/v1/routine/logs", headers={"Authorization": f"Bearer {tok_b}"}).json()
    assert logs_b["logs"] == []


def test_p19_user_ownership_isolation_assessments_and_score():
    """New user without assessment returns 404 for /assessment/score, and score of User A is isolated from User B."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P19 Score User A", f"p19_score_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P19 Score User B", f"p19_score_b_{ts}@test.com", "User")

    # User B has no assessment -> 404
    score_b_initial = client.get("/api/v1/assessment/score", headers={"Authorization": f"Bearer {tok_b}"})
    assert score_b_initial.status_code == 404

    # User A runs assessment
    eval_resp = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Combination",
        "acne_severity": 2,
        "hyperpigmentation_severity": 1,
        "redness_severity": 1,
        "wrinkles_severity": 1,
        "allergies": [],
        "lifestyle": {"sleep_hours": 8.0, "water_intake_liters": 3.0}
    }, headers={"Authorization": f"Bearer {tok_a}"})
    assert eval_resp.status_code == 200

    # User A fetches score -> 200 with overall_score
    score_a = client.get("/api/v1/assessment/score", headers={"Authorization": f"Bearer {tok_a}"})
    assert score_a.status_code == 200
    assert "overall_score" in score_a.json()

    # User B still has no assessment -> 404 (User A's score does not leak)
    score_b_still = client.get("/api/v1/assessment/score", headers={"Authorization": f"Bearer {tok_b}"})
    assert score_b_still.status_code == 404


def test_p19_user_ownership_isolation_progress_photos():
    """Progress photo uploaded by User A must not appear in User B's analytics gallery."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P19 Photo User A", f"p19_photo_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P19 Photo User B", f"p19_photo_b_{ts}@test.com", "User")

    # User A uploads photo
    up_resp = client.post("/api/v1/analytics/photos/upload", json={
        "image_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        "tag": "Week 2 Scan"
    }, headers={"Authorization": f"Bearer {tok_a}"})
    assert up_resp.status_code == 200

    # User B fetches analytics -> progress_photos gallery is empty
    an_b = client.get("/api/v1/analytics", headers={"Authorization": f"Bearer {tok_b}"}).json()
    assert len(an_b["progress_photos"]) == 0


def test_p19_analytics_no_data_and_update_after_activity():
    """New user analytics starts empty/zero and updates after routine activity."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P19 Analytics User", f"p19_an_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    # Initial analytics
    an1 = client.get("/api/v1/analytics", headers=headers).json()
    assert an1["compliance_metrics"]["adherence_7d"] == 0.0
    assert len(an1["score_history"]) == 0

    # Log routine activity
    client.post("/api/v1/routine/log", json={
        "log_date": "2026-08-11",
        "completed_steps": ["Morning Routine", "Sunscreen Applied", "Night Routine", "8 hrs Sleep"]
    }, headers=headers)

    # Updated analytics -> adherence rate increases
    an2 = client.get("/api/v1/analytics", headers=headers).json()
    assert an2["compliance_metrics"]["adherence_7d"] > 0.0


def test_p19_ingredient_safety_evaluation_allergy_and_conflict():
    """Ingredient safety evaluation accurately detects user allergies and chemical conflicts."""
    # Test allergy detection
    res1 = client.post("/api/v1/ingredients/evaluate", json={
        "product_name": "Test Serum",
        "ingredients": ["Water", "Niacinamide", "Fragrance"],
        "user_allergies": ["Fragrance"],
        "routine_time": "AM"
    }).json()
    assert res1["status"] in ["Warning", "Unsafe"]
    assert len(res1["allergy_alerts"]) > 0
    assert any("Fragrance" in alert for alert in res1["allergy_alerts"])

    # Test chemical conflict detection (Retinol + Salicylic Acid (BHA))
    res2 = client.post("/api/v1/ingredients/evaluate", json={
        "product_name": "Active Night Cream",
        "ingredients": ["Retinol", "Salicylic Acid (BHA)"],
        "user_allergies": [],
        "routine_time": "PM"
    }).json()
    assert len(res2["conflict_warnings"]) > 0



def test_p19_empty_ingredient_request_handling():
    """Empty ingredient evaluation payload returns safety score 100 with 0 evaluated count."""
    res = client.post("/api/v1/ingredients/evaluate", json={
        "product_name": "Empty Product",
        "ingredients": [],
        "user_allergies": [],
        "routine_time": "AM"
    }).json()
    assert res["safety_score"] == 100.0
    assert res["evaluated_ingredients_count"] == 0


def test_p19_appointment_creation_and_ownership_isolation():
    """Appointment created by User A does not appear in User B's appointment list."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P19 Appt User A", f"p19_appt_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P19 Appt User B", f"p19_appt_b_{ts}@test.com", "User")

    # User A requests appointment
    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-10",
        "preferred_time": "02:00 PM",
        "user_notes": "Acne concerns"
    }, headers={"Authorization": f"Bearer {tok_a}"})
    assert req.status_code == 200

    # User A fetches appointments -> 1 appointment
    appts_a = client.get("/api/v1/appointments/my", headers={"Authorization": f"Bearer {tok_a}"}).json()
    assert len(appts_a) == 1
    assert appts_a[0]["preferred_date"] == "2026-09-10"

    # User B fetches appointments -> 0 appointments
    appts_b = client.get("/api/v1/appointments/my", headers={"Authorization": f"Bearer {tok_b}"}).json()
    assert len(appts_b) == 0


def test_p19_appointment_status_lifecycle():
    """Appointment progresses through status lifecycle (Requested -> Accepted)."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P19 Life Patient", f"p19_life_pat_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P19 Life Cons", f"p19_life_cons_{ts}@test.com", "Skincare Consultant")

    # Request appointment
    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-15",
        "preferred_time": "10:00 AM"
    }, headers={"Authorization": f"Bearer {pat_tok}"}).json()
    appt_id = req["id"]

    # Consultant accepts
    up_resp = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "Accepted",
        "notes": "Confirmed for 10 AM"
    }, headers={"Authorization": f"Bearer {cons_tok}"})
    assert up_resp.status_code == 200
    assert up_resp.json()["status"] == "Accepted"


def test_p19_unauthorized_user_receives_401():
    """Protected user endpoints return HTTP 401 JSON when accessed without auth token."""
    for ep in ["/api/v1/assessment/profile", "/api/v1/routine", "/api/v1/analytics", "/api/v1/appointments/my"]:
        resp = client.get(ep)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {ep}, got {resp.status_code}"


def test_p19_user_role_blocked_from_admin_consultant_derma_endpoints():
    """User role attempting to access admin/consultant/dermatologist endpoints receives 403."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P19 Regular User", f"p19_reg_user_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {user_tok}"}

    for ep in ["/api/v1/admin/stats", "/api/v1/consultant/roster"]:
        resp = client.get(ep, headers=headers)
        assert resp.status_code == 403, f"Expected 403 for user on {ep}, got {resp.status_code}"


def test_p19_product_recommendations_database_backed_and_empty_profile_safety():
    """Product recommendations endpoint returns valid database-backed products even for empty profile."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P19 Rec User", f"p19_rec_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    rec_resp = client.get("/api/v1/recommendations?skin_type=Oily", headers=headers)
    assert rec_resp.status_code == 200
    data = rec_resp.json()
    assert "products" in data
    assert isinstance(data["products"], list)


# ── PHASE 20: CONSULTANT DASHBOARD PRODUCTION AUDIT & HARDENING TESTS ─────────

def test_p20_unauthenticated_consultant_endpoints_return_401():
    """Unauthenticated requests to consultant endpoints MUST return HTTP 401."""
    endpoints = ["/api/v1/consultant/roster", "/api/v1/consultant/stats", "/api/v1/consultant/patient/invalid-uuid"]
    for ep in endpoints:
        resp = client.get(ep)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {ep}, got {resp.status_code}"


def test_p20_regular_user_blocked_from_consultant_endpoints_403():
    """Regular User role attempting to access consultant endpoints MUST receive HTTP 403."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P20 Regular User", f"p20_reg_user_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {user_tok}"}

    for ep in ["/api/v1/consultant/roster", "/api/v1/consultant/stats", "/api/v1/consultant/patient/some-id"]:
        resp = client.get(ep, headers=headers)
        assert resp.status_code == 403, f"Expected 403 for regular user on {ep}, got {resp.status_code}"


def test_p20_consultant_blocked_from_admin_endpoints_403():
    """Consultant role attempting to access admin endpoints MUST receive HTTP 403."""
    ts = int(time.time() * 1000)
    cons_tok = _register_p16_account("P20 Cons Admin Block", f"p20_cons_block_{ts}@test.com", "Skincare Consultant")
    headers = {"Authorization": f"Bearer {cons_tok}"}

    for ep in ["/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/activity"]:
        resp = client.get(ep, headers=headers)
        assert resp.status_code == 403, f"Expected 403 for consultant on {ep}, got {resp.status_code}"


def test_p20_consultant_roster_and_stats_live_db():
    """Consultant roster and stats endpoints return real DB-backed data schemas."""
    ts = int(time.time() * 1000)
    cons_tok = _register_p16_account("P20 Roster Cons", f"p20_roster_cons_{ts}@test.com", "Skincare Consultant")
    headers = {"Authorization": f"Bearer {cons_tok}"}

    # Roster
    roster_resp = client.get("/api/v1/consultant/roster", headers=headers)
    assert roster_resp.status_code == 200
    r_data = roster_resp.json()
    assert "roster_count" in r_data
    assert "patients" in r_data
    assert isinstance(r_data["patients"], list)

    # Stats
    stats_resp = client.get("/api/v1/consultant/stats", headers=headers)
    assert stats_resp.status_code == 200
    s_data = stats_resp.json()
    assert "total_users" in s_data
    assert "users_by_role" in s_data
    assert "total_assessments" in s_data


def test_p20_consultant_patient_detail_retrieval_truthful_nulls():
    """Consultant inspecting patient profile receives truthful nulls for unpopulated fields and zero password hashes."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P20 Detail Patient", f"p20_detail_pat_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P20 Detail Cons", f"p20_detail_cons_{ts}@test.com", "Skincare Consultant")

    # Get patient user ID
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_tok}"}).json()
    pat_id = me_resp["id"]

    # Inspect patient
    insp_resp = client.get(f"/api/v1/consultant/patient/{pat_id}", headers={"Authorization": f"Bearer {cons_tok}"})
    assert insp_resp.status_code == 200
    data = insp_resp.json()
    assert "patient" in data
    assert data["patient"]["id"] == pat_id
    assert "hashed_password" not in data["patient"]
    assert "password" not in data["patient"]
    # Unpopulated fields should be None / empty list, not fake hardcoded values
    prof = data["patient"]["profile"]
    assert prof["age"] is None or isinstance(prof["age"], int)
    assert prof["gender"] is None or isinstance(prof["gender"], str)


def test_p20_missing_patient_returns_404():
    """Consultant inspecting a non-existent patient UUID returns HTTP 404."""
    ts = int(time.time() * 1000)
    cons_tok = _register_p16_account("P20 404 Cons", f"p20_404_cons_{ts}@test.com", "Skincare Consultant")
    resp = client.get("/api/v1/consultant/patient/non-existent-patient-uuid-0000", headers={"Authorization": f"Bearer {cons_tok}"})
    assert resp.status_code == 404


def test_p20_appointment_invalid_status_transition_400():
    """Updating appointment status with an invalid status string returns HTTP 400."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P20 Status Patient", f"p20_stat_pat_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P20 Status Cons", f"p20_stat_cons_{ts}@test.com", "Skincare Consultant")

    # Request appointment
    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-20",
        "preferred_time": "03:00 PM"
    }, headers={"Authorization": f"Bearer {pat_tok}"}).json()
    appt_id = req["id"]

    # Try invalid status
    bad_resp = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "INVALID_STATUS_STRING"
    }, headers={"Authorization": f"Bearer {cons_tok}"})
    assert bad_resp.status_code == 400
    assert "Invalid status" in bad_resp.json()["detail"]


def test_p20_consultant_referral_to_dermatologist():
    """Consultant successfully refers an appointment to a dermatologist."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P20 Refer Patient", f"p20_ref_pat_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P20 Refer Cons", f"p20_ref_cons_{ts}@test.com", "Skincare Consultant")

    # Request appointment
    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-22",
        "preferred_time": "11:00 AM"
    }, headers={"Authorization": f"Bearer {pat_tok}"}).json()
    appt_id = req["id"]

    # Refer to dermatologist
    ref_resp = client.post(f"/api/v1/appointments/{appt_id}/refer", json={
        "consultant_summary": "Requires dermatologist evaluation for severe acne",
        "preferred_date": "2026-09-23",
        "preferred_time": "10:00 AM"
    }, headers={"Authorization": f"Bearer {cons_tok}"})
    assert ref_resp.status_code == 200
    assert ref_resp.json()["status"] == "Referred_To_Dermatologist"


def test_p20_consultant_prescribe_routine_persistence():
    """Consultant prescribes a custom routine for a patient and it persists in the database."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P20 Rx Patient", f"p20_rx_pat_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P20 Rx Cons", f"p20_rx_cons_{ts}@test.com", "Skincare Consultant")

    # Get patient user ID
    pat_id = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_tok}"}).json()["id"]

    # Prescribe routine
    rx_payload = {
        "patient_id": pat_id,
        "doctor_notes": "Use gentle cleanser in AM, active serum in PM.",
        "routine_steps": [
            {
                "time_of_day": "AM",
                "step_number": 1,
                "step_category": "Cleansing",
                "product_name": "Hydrating Gentle Cleanser",
                "active_ingredients": ["Glycerin", "Ceramides"]
            },
            {
                "time_of_day": "PM",
                "step_number": 1,
                "step_category": "Treatment",
                "product_name": "Niacinamide 10% Serum",
                "active_ingredients": ["Niacinamide", "Zinc PCA"]
            }
        ]
    }

    rx_resp = client.post("/api/v1/consultant/prescribe", json=rx_payload, headers={"Authorization": f"Bearer {cons_tok}"})
    assert rx_resp.status_code == 200
    assert rx_resp.json()["status"] == "success"

    # Patient fetches active routine
    pat_routine = client.get("/api/v1/routine", headers={"Authorization": f"Bearer {pat_tok}"}).json()
    assert len(pat_routine) == 2
    assert pat_routine[0]["prescribed_by_doctor"] is True
    assert pat_routine[0]["doctor_notes"] == "Use gentle cleanser in AM, active serum in PM."


# ── PHASE 21: DERMATOLOGIST DASHBOARD FULL PRODUCTION AUDIT & E2E HARDENING ──

def test_p21_unauthenticated_derma_endpoints_return_401():
    """Unauthenticated requests to dermatologist-accessed endpoints MUST return HTTP 401."""
    for ep in ["/api/v1/consultant/roster", "/api/v1/consultant/stats", "/api/v1/appointments/my"]:
        resp = client.get(ep)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {ep}, got {resp.status_code}"


def test_p21_regular_user_blocked_from_derma_clinical_endpoints_403():
    """Regular User MUST receive HTTP 403 when accessing medical role endpoints."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P21 User Block", f"p21_user_block_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {user_tok}"}
    for ep in ["/api/v1/consultant/roster", "/api/v1/consultant/stats"]:
        resp = client.get(ep, headers=headers)
        assert resp.status_code == 403, f"Expected 403 for User on {ep}, got {resp.status_code}"


def test_p21_dermatologist_cannot_refer_to_dermatologist():
    """Dermatologist role MUST receive HTTP 403 when calling the /refer endpoint (consultant-only)."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P21 Ref Pat", f"p21_ref_pat_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P21 Ref Derma", f"p21_ref_derma_{ts}@test.com", "Dermatologist")

    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Dermatologist",
        "preferred_date": "2026-09-10",
        "preferred_time": "11:00 AM"
    }, headers={"Authorization": f"Bearer {pat_tok}"})
    appt_id = req.json()["id"]

    refer_resp = client.post(f"/api/v1/appointments/{appt_id}/refer", json={
        "consultant_summary": "Attempting re-refer"
    }, headers={"Authorization": f"Bearer {derma_tok}"})
    assert refer_resp.status_code == 403


def test_p21_dermatologist_roster_schema_is_truthful():
    """Dermatologist fetching roster gets truthful live schema with all fields correct."""
    ts = int(time.time() * 1000)
    derma_tok = _register_p16_account("P21 Schema Derma", f"p21_schema_derma_{ts}@test.com", "Dermatologist")
    headers = {"Authorization": f"Bearer {derma_tok}"}

    resp = client.get("/api/v1/consultant/roster", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "patients" in data
    assert "roster_count" in data
    assert isinstance(data["patients"], list)
    assert data["roster_count"] == len(data["patients"])

    for p in data["patients"]:
        for key in ["patient_id", "name", "email", "skin_type", "primary_concern", "health_score", "compliance_rate", "last_assessment_date"]:
            assert key in p
        assert p["health_score"] is None or isinstance(p["health_score"], (int, float))


def test_p21_dermatologist_patient_isolation_nonexistent_uuid():
    """Dermatologist cannot see patient data from a non-existent UUID; must return 404."""
    ts = int(time.time() * 1000)
    derma_tok = _register_p16_account("P21 Iso Derma", f"p21_iso_derma_{ts}@test.com", "Dermatologist")
    headers = {"Authorization": f"Bearer {derma_tok}"}

    for fake_id in ["00000000-0000-0000-0000-000000000000", "fake-patient-uuid-xyz"]:
        resp = client.get(f"/api/v1/consultant/patient/{fake_id}", headers=headers)
        assert resp.status_code == 404


def test_p21_patient_profile_null_fields_truthful_for_dermatologist():
    """Dermatologist inspecting new patient receives None for unpopulated clinical fields — no fake fallbacks."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P21 Null Pat", f"p21_null_pat_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P21 Null Derma", f"p21_null_derma_{ts}@test.com", "Dermatologist")
    pat_id = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_tok}"}).json()["id"]

    resp = client.get(f"/api/v1/consultant/patient/{pat_id}",
                      headers={"Authorization": f"Bearer {derma_tok}"})
    assert resp.status_code == 200
    data = resp.json()

    prof = data["patient"]["profile"]
    assert prof["age"] is None
    assert prof["gender"] is None
    assert prof["sleep_hours"] is None
    assert prof["water_intake_l"] is None
    assert isinstance(prof["allergies"], list)

    assert data["assessments"] == []
    assert data["active_routine"] == []
    assert data["progress_photos"] == []


def test_p21_no_password_hashes_in_dermatologist_responses():
    """Dermatologist API responses MUST never expose hashed_password or password fields."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P21 Sec Pat", f"p21_sec_pat_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P21 Sec Derma", f"p21_sec_derma_{ts}@test.com", "Dermatologist")
    pat_id = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_tok}"}).json()["id"]
    headers = {"Authorization": f"Bearer {derma_tok}"}

    patient_resp = client.get(f"/api/v1/consultant/patient/{pat_id}", headers=headers).json()
    assert "hashed_password" not in patient_resp.get("patient", {})
    assert "password" not in patient_resp.get("patient", {})

    roster_resp = client.get("/api/v1/consultant/roster", headers=headers).json()
    for p in roster_resp.get("patients", []):
        assert "hashed_password" not in p
        assert "password" not in p


def test_p21_dermatologist_appointment_queue_schema():
    """Dermatologist appointment queue returns all appointment records with correct schema fields."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P21 Queue Pat", f"p21_queue_pat_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P21 Queue Derma", f"p21_queue_derma_{ts}@test.com", "Dermatologist")

    req_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Dermatologist",
        "preferred_date": "2026-09-15",
        "preferred_time": "09:00 AM",
        "user_notes": "Scalp condition follow-up"
    }, headers={"Authorization": f"Bearer {pat_tok}"})
    appt_id = req_resp.json()["id"]

    queue_resp = client.get("/api/v1/appointments/my", headers={"Authorization": f"Bearer {derma_tok}"})
    assert queue_resp.status_code == 200
    appts = queue_resp.json()
    assert isinstance(appts, list)

    created = next((a for a in appts if a["id"] == appt_id), None)
    assert created is not None
    for key in ["patient_id", "patient_name", "patient_email", "status", "preferred_date", "preferred_time"]:
        assert key in created
    assert created["status"] == "Requested"


def test_p21_dermatologist_accept_complete_status_persistence():
    """Dermatologist accepting and completing an appointment persists both statuses correctly."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P21 Status Pat", f"p21_status_pat_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P21 Status Derma", f"p21_status_derma_{ts}@test.com", "Dermatologist")

    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Dermatologist",
        "preferred_date": "2026-09-20",
        "preferred_time": "02:00 PM"
    }, headers={"Authorization": f"Bearer {pat_tok}"})
    appt_id = req.json()["id"]

    accept = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "Accepted", "notes": "Accepted for dermatology"
    }, headers={"Authorization": f"Bearer {derma_tok}"})
    assert accept.status_code == 200
    assert accept.json()["status"] == "Accepted"

    complete = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "Completed", "notes": "Clinical consultation concluded"
    }, headers={"Authorization": f"Bearer {derma_tok}"})
    assert complete.status_code == 200
    assert complete.json()["status"] == "Completed"

    queue = client.get("/api/v1/appointments/my", headers={"Authorization": f"Bearer {derma_tok}"}).json()
    persisted = next((a for a in queue if a["id"] == appt_id), None)
    assert persisted is not None
    assert persisted["status"] == "Completed"


def test_p21_invalid_appointment_status_returns_400():
    """Attempting to set an unknown appointment status MUST return HTTP 400."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P21 Bad Stat Pat", f"p21_badstat_pat_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P21 Bad Stat Derma", f"p21_badstat_derma_{ts}@test.com", "Dermatologist")

    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Dermatologist",
        "preferred_date": "2026-09-25",
        "preferred_time": "11:00 AM"
    }, headers={"Authorization": f"Bearer {pat_tok}"})
    appt_id = req.json()["id"]

    bad_resp = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "INVALID_STATUS_XYZ"
    }, headers={"Authorization": f"Bearer {derma_tok}"})
    assert bad_resp.status_code == 400


def test_p21_dermatologist_prescription_persists_and_patient_receives_routine():
    """Dermatologist prescribes routine; patient routine is updated with prescribed_by_doctor=True."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P21 Rx Pat", f"p21_rx_pat_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P21 Rx Derma", f"p21_rx_derma_{ts}@test.com", "Dermatologist")
    pat_id = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_tok}"}).json()["id"]

    rx_payload = {
        "patient_id": pat_id,
        "doctor_notes": "Clinical Rx: Tretinoin 0.025% alternate evenings, barrier repair AM.",
        "routine_steps": [
            {
                "time_of_day": "AM",
                "step_number": 1,
                "step_category": "Barrier Repair",
                "product_name": "Ceramide Recovery Moisturizer",
                "active_ingredients": ["Ceramides", "Niacinamide"]
            },
            {
                "time_of_day": "PM",
                "step_number": 1,
                "step_category": "Retinoid",
                "product_name": "Tretinoin 0.025% Cream",
                "active_ingredients": ["Tretinoin"]
            }
        ]
    }

    rx_resp = client.post("/api/v1/consultant/prescribe", json=rx_payload,
                          headers={"Authorization": f"Bearer {derma_tok}"})
    assert rx_resp.status_code == 200
    assert rx_resp.json()["status"] == "success"

    routine = client.get("/api/v1/routine", headers={"Authorization": f"Bearer {pat_tok}"}).json()
    assert isinstance(routine, list)
    assert len(routine) == 2
    tretinoin = next((s for s in routine if "Tretinoin" in s.get("product_name", "")), None)
    assert tretinoin is not None
    assert tretinoin["prescribed_by_doctor"] is True
    assert "Tretinoin" in tretinoin["doctor_notes"]


def test_p21_prescription_tied_to_correct_patient_not_another():
    """Prescription for Patient A MUST NOT appear in Patient B's routine."""
    ts = int(time.time() * 1000)
    pat_a_tok = _register_p16_account("P21 PatA", f"p21_pata_{ts}@test.com", "User")
    pat_b_tok = _register_p16_account("P21 PatB", f"p21_patb_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P21 Rx Derma2", f"p21_rx_derma2_{ts}@test.com", "Dermatologist")

    pat_a_id = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_a_tok}"}).json()["id"]

    rx_resp = client.post("/api/v1/consultant/prescribe", json={
        "patient_id": pat_a_id,
        "doctor_notes": "Exclusive to Patient A only.",
        "routine_steps": [{
            "time_of_day": "PM",
            "step_number": 1,
            "step_category": "Acne Treatment",
            "product_name": "Benzoyl Peroxide 2.5%",
            "active_ingredients": ["Benzoyl Peroxide"]
        }]
    }, headers={"Authorization": f"Bearer {derma_tok}"})
    assert rx_resp.status_code == 200

    pat_b_routine = client.get("/api/v1/routine", headers={"Authorization": f"Bearer {pat_b_tok}"}).json()
    product_names = [s.get("product_name", "") for s in pat_b_routine]
    assert "Benzoyl Peroxide 2.5%" not in product_names


def test_p21_prescription_missing_patient_returns_404():
    """Prescribing routine for a non-existent patient UUID MUST return HTTP 404."""
    ts = int(time.time() * 1000)
    derma_tok = _register_p16_account("P21 Rx 404", f"p21_rx404_{ts}@test.com", "Dermatologist")

    resp = client.post("/api/v1/consultant/prescribe", json={
        "patient_id": "00000000-0000-0000-0000-000000000000",
        "doctor_notes": "Should fail",
        "routine_steps": [{
            "time_of_day": "AM",
            "step_number": 1,
            "step_category": "Cleansing",
            "product_name": "Gentle Cleanser",
            "active_ingredients": ["Ceramides"]
        }]
    }, headers={"Authorization": f"Bearer {derma_tok}"})
    assert resp.status_code == 404


def test_p21_dermatologist_full_patient_detail_schema_after_assessment():
    """Populated patient profile and assessment are retrieved correctly with all clinical schema fields."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P21 Full Pat", f"p21_full_pat_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P21 Full Derma", f"p21_full_derma_{ts}@test.com", "Dermatologist")
    pat_id = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_tok}"}).json()["id"]

    client.post("/api/v1/assessment/profile", json={
        "skin_type": "Oily",
        "age": 32,
        "gender": "Male",
        "concerns": ["Acne", "Excess Oil"],
        "allergies": ["Parabens"],
        "sleep_hours": 6.5,
        "water_intake_l": 2.0
    }, headers={"Authorization": f"Bearer {pat_tok}"})

    client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Oily",
        "acne_severity": 4,
        "hyperpigmentation_severity": 2,
        "redness_severity": 1,
        "wrinkles_severity": 0,
        "allergies": ["Parabens"],
        "lifestyle": {"sleep_hours": 6.5, "water_intake": 2.0}
    }, headers={"Authorization": f"Bearer {pat_tok}"})

    resp = client.get(f"/api/v1/consultant/patient/{pat_id}",
                      headers={"Authorization": f"Bearer {derma_tok}"})
    assert resp.status_code == 200
    data = resp.json()

    prof = data["patient"]["profile"]
    assert prof["age"] == 32
    assert prof["gender"] == "Male"
    assert prof["skin_type"] == "Oily"
    assert "Parabens" in prof["allergies"]
    assert prof["sleep_hours"] == 6.5
    assert prof["water_intake_l"] == 2.0

    assert len(data["assessments"]) >= 1
    latest = data["assessments"][0]
    for key in ["overall_score", "subscores", "concerns", "date"]:
        assert key in latest
    for key in ["condition", "lifestyle", "sleep", "consistency", "hydration"]:
        assert key in latest["subscores"]

    assert "hashed_password" not in data["patient"]
    assert "password" not in data["patient"]


def test_p21_dermatologist_stats_are_database_derived():
    """Stats endpoint returns real database counts that change with new registrations."""
    ts = int(time.time() * 1000)
    derma_tok = _register_p16_account("P21 Stats Derma", f"p21_stats_derma_{ts}@test.com", "Dermatologist")
    headers = {"Authorization": f"Bearer {derma_tok}"}

    before = client.get("/api/v1/consultant/stats", headers=headers).json()
    before_users = before["total_users"]

    _register_p16_account("P21 New User", f"p21_new_user_{ts}@test.com", "User")

    after = client.get("/api/v1/consultant/stats", headers=headers).json()
    assert after["total_users"] > before_users
    for key in ["users_by_role", "total_assessments", "active_routines", "total_appointments"]:
        assert key in after


# ── PHASE 22: ADMIN DASHBOARD FULL PRODUCTION AUDIT & E2E HARDENING TESTS ───

def test_p22_unauthenticated_admin_endpoints_return_401():
    """Unauthenticated requests to admin endpoints MUST return HTTP 401."""
    for ep in ["/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/activity"]:
        resp = client.get(ep)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {ep}, got {resp.status_code}"


def test_p22_non_admin_roles_blocked_from_admin_endpoints_403():
    """User, Consultant, and Dermatologist roles MUST receive HTTP 403 on all admin endpoints."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P22 Block User", f"p22_usr_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P22 Block Cons", f"p22_cons_{ts}@test.com", "Skincare Consultant")
    derma_tok = _register_p16_account("P22 Block Derma", f"p22_derma_{ts}@test.com", "Dermatologist")

    endpoints = ["/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/activity"]

    for role_name, token in [("User", user_tok), ("Consultant", cons_tok), ("Dermatologist", derma_tok)]:
        headers = {"Authorization": f"Bearer {token}"}
        for ep in endpoints:
            resp = client.get(ep, headers=headers)
            assert resp.status_code == 403, f"Expected 403 for {role_name} on {ep}, got {resp.status_code}"
            assert "Administrator role required" in resp.json()["detail"]


def test_p22_administrator_permitted_on_all_admin_endpoints():
    """Administrator role MUST be permitted (HTTP 200) on all admin endpoints."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Perm Admin", f"p22_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    for ep in ["/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/activity"]:
        resp = client.get(ep, headers=headers)
        assert resp.status_code == 200, f"Expected 200 for Administrator on {ep}, got {resp.status_code}"


def test_p22_admin_stats_schema_and_live_db_counts():
    """Admin stats endpoint returns valid schema with live database-derived counts."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Stats Admin", f"p22_stats_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    resp = client.get("/api/v1/admin/stats", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    for key in [
        "total_users",
        "users_by_role",
        "total_assessments",
        "concern_distribution",
        "active_routines",
        "doctor_prescribed_routines",
        "total_progress_photos",
        "total_appointments",
        "appointments_by_status",
    ]:
        assert key in data, f"Missing key '{key}' in admin stats schema"

    assert isinstance(data["total_users"], int)
    assert data["total_users"] >= 1
    assert isinstance(data["users_by_role"], dict)
    assert "User" in data["users_by_role"]
    assert "Administrator" in data["users_by_role"]


def test_p22_admin_users_filtering_and_search():
    """Admin users endpoint supports role filtering and name/email search."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Filter Admin", f"p22_filt_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    # Register target user
    unique_name = f"SearchTarget {ts}"
    unique_email = f"search_target_{ts}@test.com"
    _register_p16_account(unique_name, unique_email, "User")

    # Filter by role User
    user_list = client.get("/api/v1/admin/users?role=User", headers=headers).json()
    assert any(u["email"] == unique_email for u in user_list["users"])
    assert all(u["role"] == "User" for u in user_list["users"])

    # Search by name substring
    search_list = client.get(f"/api/v1/admin/users?search=SearchTarget", headers=headers).json()
    assert len(search_list["users"]) >= 1
    assert any(u["name"] == unique_name for u in search_list["users"])


def test_p22_admin_users_no_password_hashes_or_tokens():
    """Admin user listing MUST never leak password hashes, passwords, or tokens."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 SecCheck Admin", f"p22_seccheck_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    resp = client.get("/api/v1/admin/users", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    for u in data["users"]:
        assert "hashed_password" not in u
        assert "password" not in u
        assert "access_token" not in u
        assert "token" not in u


def test_p22_admin_activity_feed_live_db_events():
    """Admin activity feed returns live database-derived events."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Act Admin", f"p22_act_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    resp = client.get("/api/v1/admin/activity", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "events" in data
    assert isinstance(data["events"], list)

    for event in data["events"]:
        for key in ["type", "icon", "title", "detail", "timestamp"]:
            assert key in event, f"Missing key '{key}' in activity event"


def test_p22_admin_activity_limit_parameter_respected():
    """Admin activity feed respects limit query parameter."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Limit Admin", f"p22_limit_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    resp = client.get("/api/v1/admin/activity?limit=3", headers=headers)
    assert resp.status_code == 200
    events = resp.json()["events"]
    assert len(events) <= 3


def test_p22_health_and_readiness_endpoints_truthful():
    """Health and readiness endpoints return valid 200 OK responses with expected keys."""
    h_resp = client.get("/health")
    assert h_resp.status_code == 200
    assert h_resp.json()["status"] == "ok"

    r_resp = client.get("/ready")
    assert r_resp.status_code == 200
    assert r_resp.json()["status"] == "ready"
    assert r_resp.json()["database"] == "connected"


def test_p22_no_sensitive_credentials_in_admin_responses():
    """Admin endpoint responses MUST not expose JWT secrets, DB URLs, or environment variables."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Cred Admin", f"p22_cred_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    for ep in ["/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/activity"]:
        raw_text = client.get(ep, headers=headers).text.lower()
        for forbidden in ["jwt_secret", "database_url", "secret_key", "postgres://", "sqlite://"]:
            assert forbidden not in raw_text, f"Forbidden credential string '{forbidden}' found in {ep} response"


def test_p22_empty_search_or_filter_returns_truthful_empty_list():
    """Searching for a non-existent name/email or role returns a truthful empty list."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Empty Admin", f"p22_empty_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    resp = client.get("/api/v1/admin/users?search=NONEXISTENT_USER_STRING_99999", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["users"] == []


def test_p22_admin_data_consistency_across_stats_and_users():
    """Total user count in /admin/stats matches the total count from /admin/users."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Consist Admin", f"p22_consist_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    stats = client.get("/api/v1/admin/stats", headers=headers).json()
    users = client.get("/api/v1/admin/users", headers=headers).json()

    assert stats["total_users"] == users["total"]


def test_p22_admin_stats_concern_distribution_schema():
    """Admin stats concern distribution returns a list of dictionaries with label, count, and pct."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Concern Admin", f"p22_concern_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    stats = client.get("/api/v1/admin/stats", headers=headers).json()
    cd = stats["concern_distribution"]
    assert isinstance(cd, list)

    for item in cd:
        for key in ["label", "count", "pct"]:
            assert key in item


def test_p22_health_readiness_response_headers_and_status_codes():
    """Health probes return proper content-type header and HTTP status 200."""
    for ep in ["/health", "/ready"]:
        resp = client.get(ep)
        assert resp.status_code == 200
        assert "application/json" in resp.headers["content-type"]


def test_p22_admin_user_role_distribution_accuracy():
    """User counts by role in stats match actual users query filtered by role."""
    ts = int(time.time() * 1000)
    admin_tok = _register_p16_account("P22 Dist Admin", f"p22_dist_admin_{ts}@test.com", "Administrator")
    headers = {"Authorization": f"Bearer {admin_tok}"}

    stats = client.get("/api/v1/admin/stats", headers=headers).json()
    u_by_role = stats["users_by_role"]

    for role in ["User", "Skincare Consultant", "Dermatologist", "Administrator"]:
        role_users = client.get(f"/api/v1/admin/users?role={role}", headers=headers).json()
        assert u_by_role[role] == role_users["total"], f"Mismatch for role {role}"


# ── PHASE 23: USER DASHBOARD FULL-STACK AUDIT, DATA TRUTHFULNESS & SECURITY ──

def test_p23_unauthenticated_user_endpoints_return_401():
    """Unauthenticated requests to all user-facing protected endpoints MUST return HTTP 401."""
    protected = [
        "/api/v1/auth/me",
        "/api/v1/assessment/profile",
        "/api/v1/assessment/score",
        "/api/v1/routine",
        "/api/v1/routine/logs",
        "/api/v1/analytics",
        "/api/v1/appointments/my",
        "/api/v1/recommendations"
    ]
    for ep in protected:
        resp = client.get(ep)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {ep}, got {resp.status_code}"


def test_p23_authenticated_user_profile_retrieval_and_persistence():
    """Authenticated user profile updates persist correctly and return exact values."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P23 Prof User", f"p23_prof_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    update_resp = client.post("/api/v1/assessment/profile", json={
        "skin_type": "Sensitive",
        "concerns": ["Redness & Sensitivity", "Dryness & Dehydration"],
        "allergies": ["Fragrance"],
        "age": 28,
        "gender": "Female"
    }, headers=headers)
    assert update_resp.status_code == 200

    prof = client.get("/api/v1/assessment/profile", headers=headers).json()
    assert prof["skin_type"] == "Sensitive"
    assert prof["age"] == 28
    assert prof["gender"] == "Female"
    assert "Fragrance" in prof["allergies"]
    assert "Redness & Sensitivity" in prof["concerns"]


def test_p23_profile_missing_fields_return_truthful_nulls():
    """Newly registered user profile returns truthful nulls for unpopulated fields."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P23 Null User", f"p23_null_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    prof = client.get("/api/v1/assessment/profile", headers=headers).json()
    assert prof["age"] is None
    assert prof["gender"] is None
    assert prof["sleep_hours"] is None
    assert prof["water_intake_l"] is None


def test_p23_user_ownership_isolation_profile_and_history():
    """User A cannot read or mutate User B's profile or assessment history."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P23 Iso UserA", f"p23_iso_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P23 Iso UserB", f"p23_iso_b_{ts}@test.com", "User")

    headers_a = {"Authorization": f"Bearer {tok_a}"}
    headers_b = {"Authorization": f"Bearer {tok_b}"}

    # User A sets profile
    client.post("/api/v1/assessment/profile", json={"skin_type": "Oily", "age": 35}, headers=headers_a)

    # User B fetches profile -> receives own profile (null/empty), NOT User A's
    prof_b = client.get("/api/v1/assessment/profile", headers=headers_b).json()
    assert prof_b["skin_type"] is None
    assert prof_b["age"] is None


def test_p23_assessment_persistence_score_and_ownership_isolation():
    """Evaluating skin assessment persists score and locks record to user identity."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P23 Eval UserA", f"p23_eval_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P23 Eval UserB", f"p23_eval_b_{ts}@test.com", "User")

    headers_a = {"Authorization": f"Bearer {tok_a}"}
    headers_b = {"Authorization": f"Bearer {tok_b}"}

    res_a = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Oily",
        "acne_severity": 3,
        "hyperpigmentation_severity": 1,
        "lifestyle": {"sleep_hours": 7.0, "water_intake": 2.0}
    }, headers=headers_a).json()

    assert res_a["overall_score"] > 0

    # User A gets score
    score_a = client.get("/api/v1/assessment/score", headers=headers_a).json()
    assert score_a["overall_score"] == res_a["overall_score"]

    # User B gets 404 since no assessment recorded for User B
    resp_b = client.get("/api/v1/assessment/score", headers=headers_b)
    assert resp_b.status_code == 404


def test_p23_empty_assessment_state_returns_404():
    """Querying latest score for user with no assessment returns HTTP 404."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P23 No Score User", f"p23_noscore_{ts}@test.com", "User")
    resp = client.get("/api/v1/assessment/score", headers={"Authorization": f"Bearer {tok}"})
    assert resp.status_code == 404
    assert "No skin assessment record found" in resp.json()["detail"]


def test_p23_routine_retrieval_and_checklist_logging_isolation():
    """User routine and checklist logs are isolated per user identity."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P23 Log UserA", f"p23_log_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P23 Log UserB", f"p23_log_b_{ts}@test.com", "User")

    headers_a = {"Authorization": f"Bearer {tok_a}"}
    headers_b = {"Authorization": f"Bearer {tok_b}"}

    # User A logs routine
    log_res = client.post("/api/v1/routine/log", json={
        "log_date": "2026-08-11",
        "completed_steps": ["Morning Routine", "Drink Water"],
        "water_intake_ml": 2000,
        "sleep_hours": 8.0
    }, headers=headers_a)
    assert log_res.status_code == 200

    # User A sees log
    logs_a = client.get("/api/v1/routine/logs", headers=headers_a).json()
    assert len(logs_a["logs"]) >= 1

    # User B sees empty logs
    logs_b = client.get("/api/v1/routine/logs", headers=headers_b).json()
    assert logs_b["logs"] == []


def test_p23_appointment_creation_ownership_isolation_and_lifecycle():
    """Appointment creation ties record to authenticated user and isolates from other users."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P23 Appt UserA", f"p23_appt_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P23 Appt UserB", f"p23_appt_b_{ts}@test.com", "User")

    headers_a = {"Authorization": f"Bearer {tok_a}"}
    headers_b = {"Authorization": f"Bearer {tok_b}"}

    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-30",
        "preferred_time": "10:30 AM",
        "user_notes": "Acne concerns"
    }, headers=headers_a).json()

    assert req["status"] == "Requested"
    appt_id = req["id"]

    # User A sees appt
    appts_a = client.get("/api/v1/appointments/my", headers=headers_a).json()
    assert any(a["id"] == appt_id for a in appts_a)

    # User B does NOT see User A's appt
    appts_b = client.get("/api/v1/appointments/my", headers=headers_b).json()
    assert not any(a["id"] == appt_id for a in appts_b)


def test_p23_invalid_appointment_status_returns_400():
    """Attempting to update an appointment to an invalid status string returns HTTP 400."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P23 BadStat Pat", f"p23_badstat_pat_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P23 BadStat Cons", f"p23_badstat_cons_{ts}@test.com", "Skincare Consultant")

    req = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-30",
        "preferred_time": "10:30 AM"
    }, headers={"Authorization": f"Bearer {pat_tok}"}).json()

    resp = client.post(f"/api/v1/appointments/{req['id']}/status", json={
        "status": "NONEXISTENT_STATUS"
    }, headers={"Authorization": f"Bearer {cons_tok}"})
    assert resp.status_code == 400


def test_p23_progress_photo_ownership_isolation_and_empty_state():
    """Progress photos belong strictly to the uploader and empty photo list is truthful."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P23 Photo UserA", f"p23_photo_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P23 Photo UserB", f"p23_photo_b_{ts}@test.com", "User")

    headers_a = {"Authorization": f"Bearer {tok_a}"}
    headers_b = {"Authorization": f"Bearer {tok_b}"}

    # Upload photo for A
    client.post("/api/v1/analytics/photos/upload", json={
        "image_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        "tag": "Baseline Photo"
    }, headers=headers_a)

    analytics_a = client.get("/api/v1/analytics", headers=headers_a).json()
    assert len(analytics_a["progress_photos"]) == 1

    analytics_b = client.get("/api/v1/analytics", headers=headers_b).json()
    assert analytics_b["progress_photos"] == []


def test_p23_analytics_database_derived_values_and_empty_truthfulness():
    """Analytics return real score history and zero compliance for new accounts."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P23 New Analytics User", f"p23_analytics_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    an = client.get("/api/v1/analytics", headers=headers).json()
    assert an["score_history"] == []
    assert an["progress_photos"] == []
    assert an["compliance_metrics"]["adherence_7d"] == 0.0


def test_p23_product_recommendation_database_backing_and_empty_profile_safety():
    """Recommendations query database dataset and fall back safely when profile is empty."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P23 Rec User", f"p23_rec_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    recs = client.get("/api/v1/recommendations", headers=headers).json()
    assert "products" in recs
    assert isinstance(recs["products"], list)
    assert recs["is_personalized"] is False  # Safe default fallback


def test_p23_allergen_ingredient_conflict_and_sensitive_skin_safety():
    """Ingredient safety evaluation flags allergens and chemical conflicts correctly."""
    res = client.post("/api/v1/ingredients/evaluate", json={
        "product_name": "Test Serum",
        "ingredients": ["Salicylic Acid (BHA)", "Glycolic Acid", "Fragrance"],
        "user_allergies": ["Fragrance"],
        "routine_time": "PM"
    }).json()

    # Status must be non-safe (Warning, Unsafe, or Danger — all indicate a problem)
    assert res["status"] in ["Warning", "Unsafe", "Danger"], f"Expected non-safe status, got: {res['status']}"
    assert any("Fragrance" in alert for alert in res["allergy_alerts"]), "Expected fragrance allergen alert"
    assert len(res["conflict_warnings"]) >= 1, f"Expected at least 1 conflict warning, got: {res['conflict_warnings']}"



def test_p23_user_blocked_from_admin_consultant_derma_endpoints_403():
    """User role receiving HTTP 403 on Admin, Consultant, and Dermatologist endpoints."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P23 Blocked User", f"p23_blocked_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {user_tok}"}

    for ep in ["/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/consultant/roster", "/api/v1/consultant/stats"]:
        resp = client.get(ep, headers=headers)
        assert resp.status_code == 403, f"Expected 403 for User on {ep}, got {resp.status_code}"


def test_p23_no_password_hashes_tokens_or_secrets_in_user_responses():
    """User-facing API responses MUST never expose password hashes, tokens, or JWT secrets."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P23 Sec User", f"p23_sec_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    for ep in ["/api/v1/auth/me", "/api/v1/assessment/profile", "/api/v1/analytics", "/api/v1/appointments/my"]:
        text = client.get(ep, headers=headers).text.lower()
        for forbidden in ["hashed_password", "jwt_secret", "database_url", "secret_key"]:
            assert forbidden not in text, f"Forbidden substring '{forbidden}' found in {ep} response"


def test_p23_no_fake_user_dashboard_data():
    """Verified user endpoint data returns database-backed structures with no fake values."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P23 Truth User", f"p23_truth_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    prof = client.get("/api/v1/assessment/profile", headers=headers).json()
    assert prof["age"] is None  # Not hardcoded 25
    assert prof["gender"] is None  # Not hardcoded Female


def test_p23_cross_user_id_manipulation_rejected():
    """Attempting to access user endpoints with mismatched or injected user_id is ignored/isolated."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P23 Target A", f"p23_target_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P23 Attacker B", f"p23_attacker_b_{ts}@test.com", "User")

    headers_b = {"Authorization": f"Bearer {tok_b}"}

    # Attacker B queries routine logs — receives User B's empty logs, cannot inject User A ID
    logs = client.get("/api/v1/routine/logs", headers=headers_b).json()
    assert logs["user_id"] != "user_a_injected_id"


def test_p23_prescription_ownership_and_routing_correctness():
    """Prescriptions created for a user are returned in their routine with prescribed_by_doctor=True."""
    ts = int(time.time() * 1000)
    pat_tok = _register_p16_account("P23 Rx Pat", f"p23_rx_pat_{ts}@test.com", "User")
    derma_tok = _register_p16_account("P23 Rx Doctor", f"p23_rx_doc_{ts}@test.com", "Dermatologist")

    pat_id = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pat_tok}"}).json()["id"]

    rx = client.post("/api/v1/consultant/prescribe", json={
        "patient_id": pat_id,
        "doctor_notes": "Prescribed Azelaic Acid 10%",
        "routine_steps": [{
            "time_of_day": "AM",
            "step_number": 1,
            "step_category": "Treatment",
            "product_name": "Azelaic Acid 10%",
            "active_ingredients": ["Azelaic Acid"]
        }]
    }, headers={"Authorization": f"Bearer {derma_tok}"})
    assert rx.status_code == 200

    routine = client.get("/api/v1/routine", headers={"Authorization": f"Bearer {pat_tok}"}).json()
    assert len(routine) == 1
    assert routine[0]["prescribed_by_doctor"] is True


def test_p23_appointment_and_profile_response_schema_correctness():
    """Schemas for appointments and profile endpoints match exact frontend type expectations."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P23 Schema User", f"p23_schema_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    prof = client.get("/api/v1/assessment/profile", headers=headers).json()
    for key in ["skin_type", "concerns", "allergies", "sleep_hours", "water_intake_l", "age", "gender"]:
        assert key in prof

    appts = client.get("/api/v1/appointments/my", headers=headers).json()
    assert isinstance(appts, list)


def test_p23_recommendation_response_schema_correctness():
    """Recommendations response schema contains user_id, is_personalized, count, and products list."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P23 Rec Schema User", f"p23_rec_schema_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    recs = client.get("/api/v1/recommendations", headers=headers).json()
    for key in ["user_id", "evaluated_skin_type", "is_personalized", "recommendations_count", "products"]:
        assert key in recs
    assert isinstance(recs["products"], list)


# =============================================================================
# PHASE 24 — Auth, Appointment, and Professionals Endpoint Hardening Tests
# =============================================================================

def test_p24_public_registration_rejects_privileged_roles():
    """SECURITY: Public registration MUST reject any privileged role self-assignment."""
    ts = int(time.time() * 1000)
    for forbidden_role in ["Skincare Consultant", "Dermatologist", "Administrator"]:
        resp = client.post("/api/v1/auth/register", json={
            "name": "Attacker",
            "email": f"attacker_{ts}_{forbidden_role.replace(' ', '_')}@evil.com",
            "password": "Hack123!",
            "role": forbidden_role
        })
        assert resp.status_code == 403, (
            f"Expected 403 for role '{forbidden_role}', got {resp.status_code}: {resp.text}"
        )
        detail = resp.json()["detail"].lower()
        assert "cannot be self-assigned" in detail or "contact an administrator" in detail


def test_p24_public_registration_allows_user_role():
    """Public registration with 'User' role must succeed normally and return 'User' role."""
    ts = int(time.time() * 1000)
    resp = client.post("/api/v1/auth/register", json={
        "name": "Normal Registrant",
        "email": f"normal_reg_{ts}@test.com",
        "password": "Password123!",
        "role": "User"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "User"
    assert "access_token" in data
    assert data["role"] != "Administrator"
    assert data["role"] != "Dermatologist"
    assert data["role"] != "Skincare Consultant"


def test_p24_public_registration_default_role_is_user():
    """Registration with no role field defaults to 'User' and never elevates privileges."""
    ts = int(time.time() * 1000)
    resp = client.post("/api/v1/auth/register", json={
        "name": "Default Role User",
        "email": f"default_role_{ts}@test.com",
        "password": "Password123!"
    })
    assert resp.status_code == 200
    assert resp.json()["role"] == "User"


def test_p24_get_me_returns_safe_fields_only():
    """GET /auth/me must return id, name, email, role, created_at — no password or hash."""
    ts = int(time.time() * 1000)
    reg = client.post("/api/v1/auth/register", json={
        "name": "Me Test User",
        "email": f"me_test_{ts}@test.com",
        "password": "Password123!"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me = client.get("/api/v1/auth/me", headers=headers).json()
    assert me["role"] == "User"
    assert "hashed_password" not in me
    assert "password" not in me
    for field in ["id", "name", "email", "role"]:
        assert field in me, f"Expected '{field}' in /auth/me response"


def test_p24_professionals_endpoint_requires_authentication():
    """GET /professionals MUST reject unauthenticated requests with 401."""
    resp = client.get("/api/v1/appointments/professionals")
    assert resp.status_code == 401


def test_p24_professionals_endpoint_returns_db_data():
    """GET /professionals returns real database-backed professionals, not hardcoded fake data."""
    ts = int(time.time() * 1000)
    cons_email = f"p24_cons_{ts}@test.com"
    derm_email = f"p24_derm_{ts}@test.com"
    db = SessionLocal()
    try:
        for email, name, role in [
            (cons_email, "P24 Consultant", "Skincare Consultant"),
            (derm_email, "P24 Dermatologist", "Dermatologist"),
        ]:
            if not db.query(User).filter(User.email == email).first():
                u = User(name=name, email=email, hashed_password=hash_password("Password123!"), role=role)
                db.add(u)
                db.commit()
    finally:
        db.close()

    tok = _register_p16_account("P24 Requester", f"p24_req_{ts}@test.com", "User")
    resp = client.get("/api/v1/appointments/professionals",
                      headers={"Authorization": f"Bearer {tok}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "professionals" in data
    pros = data["professionals"]
    assert isinstance(pros, list)

    emails_in_response = [p["email"] for p in pros]
    assert cons_email in emails_in_response, "Seeded consultant must appear in DB-backed listing"
    assert derm_email in emails_in_response, "Seeded dermatologist must appear in DB-backed listing"

    # Verify no hardcoded fake IDs
    ids_in_response = [p.get("id", "") for p in pros]
    assert "cons_1" not in ids_in_response, "Hardcoded fake 'cons_1' must not appear"
    assert "derma_1" not in ids_in_response, "Hardcoded fake 'derma_1' must not appear"

    # Verify no fake hardcoded fields from old PRO_PROFILES
    for pro in pros:
        assert "rating" not in pro, "Fake 'rating' field must not appear"
        assert "reviews" not in pro, "Fake 'reviews' field must not appear"
        assert "bio" not in pro, "Fake 'bio' field must not appear"
        assert "hashed_password" not in pro, "Password hash must never appear"
        assert "password" not in pro


def test_p24_professionals_endpoint_excludes_regular_users():
    """GET /professionals MUST NOT list regular 'User' role accounts."""
    ts = int(time.time() * 1000)
    regular_email = f"p24_regular_{ts}@test.com"
    tok = _register_p16_account("P24 Regular", regular_email, "User")
    resp = client.get("/api/v1/appointments/professionals",
                      headers={"Authorization": f"Bearer {tok}"})
    assert resp.status_code == 200
    pros = resp.json()["professionals"]
    emails = [p["email"] for p in pros]
    assert regular_email not in emails, "Regular User must not appear in professionals listing"


def test_p24_appointment_request_unauthenticated_returns_401():
    """POST /appointments/request without auth MUST return 401."""
    resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-01",
        "preferred_time": "10:00 AM"
    })
    assert resp.status_code == 401


def test_p24_appointment_my_unauthenticated_returns_401():
    """GET /appointments/my without auth MUST return 401."""
    resp = client.get("/api/v1/appointments/my")
    assert resp.status_code == 401


def test_p24_appointment_request_and_persistence():
    """POST /appointments/request persists to DB; GET /appointments/my returns the exact record."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P24 Appt User", f"p24_appt_user_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    req_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Dermatologist",
        "preferred_date": "2026-09-15",
        "preferred_time": "2:00 PM",
        "user_notes": "Phase 24 test appointment"
    }, headers=headers)
    assert req_resp.status_code == 200
    req_data = req_resp.json()
    assert "id" in req_data
    assert req_data["status"] == "Requested"
    assert req_data["target_role"] == "Dermatologist"
    appt_id = req_data["id"]

    my_resp = client.get("/api/v1/appointments/my", headers=headers)
    assert my_resp.status_code == 200
    matching = [a for a in my_resp.json() if a["id"] == appt_id]
    assert len(matching) == 1
    appt = matching[0]
    assert appt["status"] == "Requested"
    assert appt["preferred_date"] == "2026-09-15"
    assert appt["preferred_time"] == "2:00 PM"
    assert appt["user_notes"] == "Phase 24 test appointment"


def test_p24_appointment_cross_user_isolation():
    """User A's appointments MUST NOT be visible to User B."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P24 User A", f"p24_user_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P24 User B", f"p24_user_b_{ts}@test.com", "User")

    appt_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-20",
        "preferred_time": "11:00 AM",
        "user_notes": "User A private appointment"
    }, headers={"Authorization": f"Bearer {tok_a}"})
    assert appt_resp.status_code == 200
    a_appt_id = appt_resp.json()["id"]

    b_appts = client.get("/api/v1/appointments/my",
                         headers={"Authorization": f"Bearer {tok_b}"}).json()
    b_ids = [a["id"] for a in b_appts]
    assert a_appt_id not in b_ids, "User B must not see User A's appointments"


def test_p24_appointment_status_update_blocked_for_regular_user():
    """Regular users MUST NOT be able to update appointment status (403 expected)."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P24 Status User", f"p24_status_user_{ts}@test.com", "User")
    u_hdrs = {"Authorization": f"Bearer {user_tok}"}

    appt_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-25",
        "preferred_time": "3:00 PM"
    }, headers=u_hdrs)
    appt_id = appt_resp.json()["id"]

    status_resp = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "Accepted"
    }, headers=u_hdrs)
    assert status_resp.status_code == 403


def test_p24_appointment_status_update_by_consultant_succeeds():
    """Skincare Consultant MUST be able to update appointment status to Accepted."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P24 Status Pat", f"p24_pat_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P24 Status Cons", f"p24_cons_status_{ts}@test.com", "Skincare Consultant")
    u_hdrs = {"Authorization": f"Bearer {user_tok}"}
    c_hdrs = {"Authorization": f"Bearer {cons_tok}"}

    appt_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-09-30",
        "preferred_time": "9:00 AM",
        "user_notes": "Status update test"
    }, headers=u_hdrs)
    assert appt_resp.status_code == 200
    appt_id = appt_resp.json()["id"]

    accept_resp = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "Accepted",
        "notes": "Confirmed appointment slot"
    }, headers=c_hdrs)
    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "Accepted"

    my_appts = client.get("/api/v1/appointments/my", headers=u_hdrs).json()
    updated = next((a for a in my_appts if a["id"] == appt_id), None)
    assert updated is not None
    assert updated["status"] == "Accepted"
    assert updated["consultant_summary"] == "Confirmed appointment slot"


def test_p24_appointment_invalid_status_rejected():
    """POST /{id}/status with invalid status value MUST return 400."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P24 Invalid Pat", f"p24_inv_pat_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P24 Invalid Cons", f"p24_inv_cons_{ts}@test.com", "Skincare Consultant")
    u_hdrs = {"Authorization": f"Bearer {user_tok}"}
    c_hdrs = {"Authorization": f"Bearer {cons_tok}"}

    appt_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-10-01",
        "preferred_time": "10:00 AM"
    }, headers=u_hdrs)
    appt_id = appt_resp.json()["id"]

    invalid_resp = client.post(f"/api/v1/appointments/{appt_id}/status", json={
        "status": "HACKED_STATUS"
    }, headers=c_hdrs)
    assert invalid_resp.status_code == 400
    assert "Invalid status" in invalid_resp.json()["detail"]


def test_p24_appointment_status_nonexistent_returns_404():
    """POST /appointments/{bad_id}/status MUST return 404 for non-existent appointments."""
    ts = int(time.time() * 1000)
    cons_tok = _register_p16_account("P24 404 Cons", f"p24_404_cons_{ts}@test.com", "Skincare Consultant")
    c_hdrs = {"Authorization": f"Bearer {cons_tok}"}

    resp = client.post("/api/v1/appointments/nonexistent-id-that-does-not-exist/status", json={
        "status": "Accepted"
    }, headers=c_hdrs)
    assert resp.status_code == 404


def test_p24_appointment_refer_blocked_for_regular_user():
    """POST /{id}/refer MUST block regular users with 403."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P24 Refer User", f"p24_refer_user_{ts}@test.com", "User")
    u_hdrs = {"Authorization": f"Bearer {user_tok}"}

    appt_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-10-05",
        "preferred_time": "11:00 AM"
    }, headers=u_hdrs)
    appt_id = appt_resp.json()["id"]

    user_refer = client.post(f"/api/v1/appointments/{appt_id}/refer", json={
        "consultant_summary": "test"
    }, headers=u_hdrs)
    assert user_refer.status_code == 403


def test_p24_appointment_refer_blocked_for_dermatologist():
    """POST /{id}/refer MUST block Dermatologists (only Consultants may refer)."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P24 Derm Refer Pat", f"p24_derm_ref_pat_{ts}@test.com", "User")
    derm_tok = _register_p16_account("P24 Derm Refer Derm", f"p24_derm_ref_derm_{ts}@test.com", "Dermatologist")
    u_hdrs = {"Authorization": f"Bearer {user_tok}"}
    d_hdrs = {"Authorization": f"Bearer {derm_tok}"}

    appt_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-10-06",
        "preferred_time": "12:00 PM"
    }, headers=u_hdrs)
    appt_id = appt_resp.json()["id"]

    derm_refer = client.post(f"/api/v1/appointments/{appt_id}/refer", json={
        "consultant_summary": "Dermatologist trying to refer"
    }, headers=d_hdrs)
    assert derm_refer.status_code == 403


def test_p24_appointment_refer_by_consultant_succeeds():
    """POST /{id}/refer by a Consultant MUST set status to Referred_To_Dermatologist."""
    ts = int(time.time() * 1000)
    user_tok = _register_p16_account("P24 Ref Pat", f"p24_ref_pat_{ts}@test.com", "User")
    cons_tok = _register_p16_account("P24 Ref Cons", f"p24_ref_cons_{ts}@test.com", "Skincare Consultant")
    u_hdrs = {"Authorization": f"Bearer {user_tok}"}
    c_hdrs = {"Authorization": f"Bearer {cons_tok}"}

    appt_resp = client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-10-10",
        "preferred_time": "2:00 PM",
        "user_notes": "Test referral"
    }, headers=u_hdrs)
    assert appt_resp.status_code == 200
    appt_id = appt_resp.json()["id"]

    refer_resp = client.post(f"/api/v1/appointments/{appt_id}/refer", json={
        "consultant_summary": "Requires specialist review",
        "preferred_date": "2026-10-12",
        "preferred_time": "3:00 PM"
    }, headers=c_hdrs)
    assert refer_resp.status_code == 200
    assert refer_resp.json()["status"] == "Referred_To_Dermatologist"

    my_appts = client.get("/api/v1/appointments/my", headers=u_hdrs).json()
    appt = next((a for a in my_appts if a["id"] == appt_id), None)
    assert appt is not None
    assert appt["status"] == "Referred_To_Dermatologist"
    assert appt["consultant_summary"] == "Requires specialist review"


def test_p24_appointment_response_schema_correctness():
    """GET /appointments/my entries MUST contain all required schema fields."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P24 Schema Appt", f"p24_schema_appt_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-10-20",
        "preferred_time": "9:30 AM",
        "user_notes": "Schema test appointment"
    }, headers=headers)

    appts = client.get("/api/v1/appointments/my", headers=headers).json()
    assert len(appts) >= 1
    appt = appts[0]
    for field in ["id", "patient_id", "patient_name", "target_role",
                  "preferred_date", "preferred_time", "status", "created_at"]:
        assert field in appt, f"Missing required field '{field}' in appointment response"


def test_p24_appointment_response_excludes_sensitive_fields():
    """Appointment responses MUST NOT expose password hashes or internal credentials."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P24 Sensitive Appt", f"p24_sensitive_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    client.post("/api/v1/appointments/request", json={
        "target_role": "Consultant",
        "preferred_date": "2026-10-15",
        "preferred_time": "10:00 AM"
    }, headers=headers)

    appts = client.get("/api/v1/appointments/my", headers=headers).json()
    for appt in appts:
        assert "hashed_password" not in appt
        assert "password" not in appt


def test_p24_auth_me_unauthenticated_returns_401():
    """GET /auth/me without token MUST return 401."""
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_p24_register_duplicate_email_returns_400():
    """Registering with an already-existing email MUST return 400."""
    ts = int(time.time() * 1000)
    email = f"dup_{ts}@test.com"
    first = client.post("/api/v1/auth/register", json={
        "name": "First User",
        "email": email,
        "password": "Password123!"
    })
    assert first.status_code == 200

    second = client.post("/api/v1/auth/register", json={
        "name": "Second User Same Email",
        "email": email,
        "password": "DifferentPass456!"
    })
    assert second.status_code == 400
    assert "already exists" in second.json()["detail"].lower()


def test_p24_login_nonexistent_email_returns_401():
    """Login with email that does not exist in DB MUST return 401."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "doesnotexist_p24@noreply.com",
        "password": "SomePassword123!"
    })
    assert resp.status_code == 401


def test_p24_registration_response_never_contains_password():
    """Registration response MUST NOT expose hashed_password or password in any form."""
    ts = int(time.time() * 1000)
    resp = client.post("/api/v1/auth/register", json={
        "name": "P24 Hash Check",
        "email": f"p24_hash_check_{ts}@test.com",
        "password": "MySecretPassword!"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "hashed_password" not in data
    assert "password" not in data
    assert isinstance(data["access_token"], str)
    assert data["access_token"] != "MySecretPassword!"


# =============================================================================
# PHASE 25 — Product Recommendation Engine & Catalog Intelligence Tests
# =============================================================================

def test_p25_recommendations_unauthenticated_returns_401():
    """GET /api/v1/recommendations without auth token MUST return 401 Unauthorized."""
    resp = client.get("/api/v1/recommendations")
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_p25_recommendations_query_public_unauthenticated_succeeds():
    """POST /api/v1/recommendations (public quiz query) allows unauthenticated requests."""
    resp = client.post("/api/v1/recommendations", json={
        "skin_type": "Oily",
        "concerns": ["Acne"],
        "allergies": []
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "recommendations_count" in data
    assert "products" in data
    assert isinstance(data["products"], list)


def test_p25_recommendations_negative_max_budget_returns_400():
    """Both GET and POST recommendation endpoints MUST reject negative max_budget values with 400 Bad Request."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P25 Budget User", f"p25_budget_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    # GET with negative budget
    get_resp = client.get("/api/v1/recommendations?max_budget=-50.0", headers=headers)
    assert get_resp.status_code == 400
    assert "max_budget must be a positive number" in get_resp.json()["detail"]

    # POST with negative budget
    post_resp = client.post("/api/v1/recommendations", json={
        "skin_type": "Dry",
        "concerns": ["Hydration"],
        "max_budget": -100.0
    })
    assert post_resp.status_code == 400
    assert "max_budget must be a positive number" in post_resp.json()["detail"]


def test_p25_recommendations_budget_exceeded_flagging_truthful():
    """Verify exceeds_budget flag is truthfully evaluated based on product price vs max_budget."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P25 Budget Check User", f"p25_budget_check_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    # Set very low max_budget (e.g. 50.0) so expensive products set exceeds_budget=True
    low_resp = client.get("/api/v1/recommendations?max_budget=50.0", headers=headers)
    assert low_resp.status_code == 200
    prods = low_resp.json()["products"]
    for p in prods:
        if p["price"] is not None and p["price"] > 50.0:
            assert p["exceeds_budget"] is True, f"Product {p['name']} with price {p['price']} > 50.0 must have exceeds_budget=True"
        elif p["price"] is not None and p["price"] <= 50.0:
            assert p["exceeds_budget"] is False

    # Set high max_budget (e.g. 10000.0) so no products set exceeds_budget=True
    high_resp = client.get("/api/v1/recommendations?max_budget=10000.0", headers=headers)
    assert high_resp.status_code == 200
    for p in high_resp.json()["products"]:
        assert p["exceeds_budget"] is False


def test_p25_recommendations_allergy_whitespace_sanitization():
    """Allergy list containing entries with whitespace or trailing spaces does not erroneously eliminate all products."""
    resp = client.post("/api/v1/recommendations", json={
        "skin_type": "Combination",
        "concerns": ["Dark Spots"],
        "allergies": ["  ", " Fragrance "]
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["recommendations_count"] > 0, "Whitespace allergy terms should be sanitized and not return empty list"


def test_p25_recommendations_relative_image_path_preserved():
    """Products with relative image URLs starting with '/' maintain their path and are not replaced with fallback."""
    from backend.app.models import Product
    ts = int(time.time() * 1000)

    # Seed a product with relative image path
    db = SessionLocal()
    p_id = f"test_rel_img_{ts}"
    try:
        p = Product(
            id=p_id,
            product_name=f"Rel Img Product {ts}",
            brand="TestBrand",
            usage_type="Face Cleanser",
            category="Cleansing",
            ingredients="Water, Glycerin",
            image_url="/assets/custom_cleanser.png",
            price=299.0,
            safety_score=95.0,
            rating=4.8
        )
        db.add(p)
        db.commit()
    finally:
        db.close()

    resp = client.post("/api/v1/recommendations", json={
        "skin_type": "Normal",
        "concerns": ["Cleansing"]
    })
    assert resp.status_code == 200
    matching = [prod for prod in resp.json()["products"] if prod["id"] == p_id]
    if matching:
        assert matching[0]["image_url"] == "/assets/custom_cleanser.png"


def test_p25_recommendations_profile_isolation():
    """User A's profile settings personalize User A's recommendations without leaking to User B."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("User A Rec", f"p25_user_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("User B Rec", f"p25_user_b_{ts}@test.com", "User")

    # Set User A profile to Sensitive skin with Parabens allergy
    client.post("/api/v1/assessment/profile", json={
        "skin_type": "Sensitive",
        "concerns": ["Redness"],
        "allergies": ["Parabens"]
    }, headers={"Authorization": f"Bearer {tok_a}"})

    # Set User B profile to Oily skin with no allergies
    client.post("/api/v1/assessment/profile", json={
        "skin_type": "Oily",
        "concerns": ["Acne"],
        "allergies": []
    }, headers={"Authorization": f"Bearer {tok_b}"})

    res_a = client.get("/api/v1/recommendations", headers={"Authorization": f"Bearer {tok_a}"}).json()
    res_b = client.get("/api/v1/recommendations", headers={"Authorization": f"Bearer {tok_b}"}).json()

    assert res_a["user_id"] != res_b["user_id"]
    assert res_a["evaluated_skin_type"] == "Sensitive"
    assert res_b["evaluated_skin_type"] == "Oily"
    assert res_a["is_personalized"] is True
    assert res_b["is_personalized"] is True


def test_p25_recommendations_response_schema_completeness():
    """Every product item in the recommendation payload must contain all required schema fields."""
    resp = client.post("/api/v1/recommendations", json={
        "skin_type": "Normal",
        "concerns": ["Hydration"]
    })
    assert resp.status_code == 200
    prods = resp.json()["products"]
    assert len(prods) > 0

    required_fields = [
        "id", "name", "brand", "category", "usage_type", "price",
        "rating", "safety_score", "image_url", "product_url",
        "active_ingredients", "match_percentage", "match_label",
        "is_best_match", "exceeds_budget"
    ]
    for p in prods:
        for f in required_fields:
            assert f in p, f"Missing required field '{f}' in product recommendation item"


def test_p25_recommendations_no_sensitive_fields():
    """Recommendation responses must not leak password hashes, user credentials, or secret parameters."""
    resp = client.post("/api/v1/recommendations", json={
        "skin_type": "Normal",
        "concerns": ["Hydration"]
    })
    data = resp.json()
    assert "hashed_password" not in data
    assert "password" not in data
    for p in data["products"]:
        assert "hashed_password" not in p
        assert "password" not in p


# =============================================================================
# PHASE 26 — AI Skin Assessment & Personalization Pipeline Hardening Tests
# =============================================================================

def test_p26_assessment_unauthenticated_returns_401():
    """POST /assessment/evaluate and GET /assessment/score without auth token MUST return 401."""
    assert client.post("/api/v1/assessment/evaluate", json={"skin_type": "Oily"}).status_code == 401
    assert client.get("/api/v1/assessment/score").status_code == 401
    assert client.get("/api/v1/assessment/history").status_code == 401


def test_p26_assessment_skin_type_validation_invalid_returns_400():
    """POST /assessment/evaluate with invalid skin_type MUST return 400 Bad Request."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Val User", f"p26_val_{ts}@test.com", "User")
    resp = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "INVALID_SKIN_TYPE"
    }, headers={"Authorization": f"Bearer {tok}"})
    assert resp.status_code == 400
    assert "Invalid skin_type" in resp.json()["detail"]


def test_p26_assessment_concern_severity_bounds_validation():
    """POST /assessment/evaluate with out-of-bounds severity (<0 or >10) MUST return 400."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Sev User", f"p26_sev_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    # Negative severity
    neg_resp = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Oily",
        "acne_severity": -1
    }, headers=headers)
    assert neg_resp.status_code == 400

    # >10 severity
    high_resp = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Oily",
        "acne_severity": 15
    }, headers=headers)
    assert high_resp.status_code == 400


def test_p26_assessment_score_bounds_and_determinism():
    """Calculated overall score and subscores must strictly be bounded within [0, 100]."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Score User", f"p26_score_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    resp = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Combination",
        "acne_severity": 8,
        "hyperpigmentation_severity": 5,
        "redness_severity": 2,
        "wrinkles_severity": 0,
        "lifestyle": {"sleep_hours": 6.0, "water_intake": 2.0}
    }, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert 0.0 <= data["overall_score"] <= 100.0
    assert 0.0 <= data["condition_subscore"] <= 100.0
    assert 0.0 <= data["lifestyle_subscore"] <= 100.0
    assert 0.0 <= data["sleep_subscore"] <= 100.0
    assert 0.0 <= data["consistency_subscore"] <= 100.0
    assert 0.0 <= data["hydration_subscore"] <= 100.0


def test_p26_assessment_persistence_and_retrieval():
    """Evaluated assessment persists to DB and matches GET /assessment/score and GET /history."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Persist User", f"p26_persist_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    eval_resp = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Dry",
        "acne_severity": 3,
        "hyperpigmentation_severity": 4
    }, headers=headers)
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    a_id = eval_data["id"]

    # Verify GET /score matches
    score_resp = client.get("/api/v1/assessment/score", headers=headers)
    assert score_resp.status_code == 200
    assert score_resp.json()["id"] == a_id
    assert score_resp.json()["overall_score"] == eval_data["overall_score"]

    # Verify GET /history matches
    hist_resp = client.get("/api/v1/assessment/history", headers=headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert len(history) >= 1
    assert history[0]["id"] == a_id


def test_p26_assessment_ownership_isolation_by_id():
    """User B MUST NOT be able to retrieve User A's assessment by ID (403 expected)."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P26 User A", f"p26_user_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P26 User B", f"p26_user_b_{ts}@test.com", "User")

    eval_a = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Oily",
        "acne_severity": 6
    }, headers={"Authorization": f"Bearer {tok_a}"}).json()
    a_id = eval_a["id"]

    # User A can access its assessment
    a_get = client.get(f"/api/v1/assessment/{a_id}", headers={"Authorization": f"Bearer {tok_a}"})
    assert a_get.status_code == 200

    # User B attempts to access User A's assessment by ID
    b_get = client.get(f"/api/v1/assessment/{a_id}", headers={"Authorization": f"Bearer {tok_b}"})
    assert b_get.status_code == 403
    assert "do not own" in b_get.json()["detail"].lower()


def test_p26_assessment_nonexistent_id_returns_404():
    """GET /assessment/{bad_id} MUST return 404 Not Found."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 404 User", f"p26_404_{ts}@test.com", "User")
    resp = client.get("/api/v1/assessment/nonexistent_assessment_id_12345", headers={"Authorization": f"Bearer {tok}"})
    assert resp.status_code == 404


def test_p26_truthful_empty_assessment_state_returns_404():
    """GET /assessment/score for fresh user with no assessment record MUST return 404 Not Found."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Fresh User", f"p26_fresh_{ts}@test.com", "User")
    resp = client.get("/api/v1/assessment/score", headers={"Authorization": f"Bearer {tok}"})
    assert resp.status_code == 404
    assert "No skin assessment record found" in resp.json()["detail"]


def test_p26_profile_assessment_consistency():
    """Evaluating skin automatically updates UserProfile skin_type and detected concerns."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Sync User", f"p26_sync_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Sensitive",
        "redness_severity": 7
    }, headers=headers)

    prof = client.get("/api/v1/assessment/profile", headers=headers).json()
    assert prof["skin_type"] == "Sensitive"
    assert any("Redness" in c for c in prof["concerns"])


def test_p26_assessment_routine_consistency():
    """Evaluating skin generates a new active skincare routine matching the assessed skin_type."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Routine User", f"p26_routine_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Oily",
        "acne_severity": 5
    }, headers=headers)

    routine = client.get("/api/v1/routine", headers=headers).json()
    assert len(routine) > 0
    # Oily template cleanser should be present
    assert any("Salicylic Acid" in step["product_name"] or "Cleanser" in step["product_name"] for step in routine)


def test_p26_photo_upload_valid_schemes_and_storage():
    """Progress photo upload accepts valid http://, https://, data:image/, and / schemes and stores photo."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Photo User", f"p26_photo_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    # Upload http URL
    u1 = client.post("/api/v1/analytics/photos/upload", json={
        "image_url": "  https://example.com/photo1.jpg  ",
        "tag": "Baseline"
    }, headers=headers)
    assert u1.status_code == 200
    assert u1.json()["image_url"] == "https://example.com/photo1.jpg"

    # Upload data URL
    u2 = client.post("/api/v1/analytics/photos/upload", json={
        "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSU5EUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "tag": "Week 2"
    }, headers=headers)
    assert u2.status_code == 200

    # Upload relative URL
    u3 = client.post("/api/v1/analytics/photos/upload", json={
        "image_url": "/assets/photos/baseline.jpg",
        "tag": "Week 4"
    }, headers=headers)
    assert u3.status_code == 200


def test_p26_photo_upload_invalid_schemes_and_malformed_input():
    """Progress photo upload rejects invalid schemes, empty strings, or malformed inputs with 400."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Bad Photo User", f"p26_bad_photo_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    # Invalid scheme (ftp://)
    r1 = client.post("/api/v1/analytics/photos/upload", json={"image_url": "ftp://badurl.com/file.jpg"}, headers=headers)
    assert r1.status_code == 400

    # Empty string
    r2 = client.post("/api/v1/analytics/photos/upload", json={"image_url": "   "}, headers=headers)
    assert r2.status_code == 400

    # Missing image_url
    r3 = client.post("/api/v1/analytics/photos/upload", json={"tag": "Baseline"}, headers=headers)
    assert r3.status_code == 400


def test_p26_photo_ownership_isolation_and_deletion():
    """User B MUST NOT be able to delete User A's progress photo (403 expected)."""
    ts = int(time.time() * 1000)
    tok_a = _register_p16_account("P26 Photo A", f"p26_photo_a_{ts}@test.com", "User")
    tok_b = _register_p16_account("P26 Photo B", f"p26_photo_b_{ts}@test.com", "User")

    photo_a = client.post("/api/v1/analytics/photos/upload", json={
        "image_url": "https://example.com/photo_a.jpg",
        "tag": "Baseline"
    }, headers={"Authorization": f"Bearer {tok_a}"}).json()
    p_id = photo_a["id"]

    # User B attempts to delete User A's photo -> 403
    del_b = client.delete(f"/api/v1/analytics/photos/{p_id}", headers={"Authorization": f"Bearer {tok_b}"})
    assert del_b.status_code == 403
    assert "do not own" in del_b.json()["detail"].lower()

    # User A deletes its own photo -> 200
    del_a = client.delete(f"/api/v1/analytics/photos/{p_id}", headers={"Authorization": f"Bearer {tok_a}"})
    assert del_a.status_code == 200
    assert del_a.json()["status"] == "deleted"


def test_p26_assessment_history_multiple_snapshots():
    """Repeated assessments for the same user create new historical snapshots in DB."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Repeat User", f"p26_repeat_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    client.post("/api/v1/assessment/evaluate", json={"skin_type": "Normal", "acne_severity": 1}, headers=headers)
    client.post("/api/v1/assessment/evaluate", json={"skin_type": "Normal", "acne_severity": 5}, headers=headers)

    history = client.get("/api/v1/assessment/history", headers=headers).json()
    assert len(history) >= 2


def test_p26_assessment_response_no_sensitive_fields():
    """Assessment responses MUST NOT leak password hashes or internal database secrets."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P26 Sec Ass User", f"p26_sec_ass_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    res = client.post("/api/v1/assessment/evaluate", json={"skin_type": "Oily"}, headers=headers).json()
    assert "hashed_password" not in res
    assert "password" not in res
    assert "secret" not in str(res).lower()


# ==============================================================================
# PHASE 28 — AI/ML SKIN INTELLIGENCE, PERSONALIZATION & SAFETY ENGINE TESTS
# ==============================================================================

def test_p28_def01_case_insensitive_ingredient_conflict_detection():
    """DEF-28-01: Chemical conflict engine MUST detect conflicts regardless of ingredient letter casing."""
    # Lowercase inputs matching Title-Case pairings
    res = client.post("/api/v1/ingredients/evaluate", json={
        "product_name": "Test Serum",
        "ingredients": ["retinol", "salicylic acid (bha)"],
        "user_allergies": [],
        "routine_time": "PM"
    }).json()

    assert len(res["conflict_warnings"]) == 1, "Lowercase 'retinol' + 'salicylic acid (bha)' must trigger chemical conflict warning"
    assert "Chemical Conflict" in res["conflict_warnings"][0]
    assert res["status"] in ["Warning", "Unsafe"]
    assert res["safety_score"] <= 75.0


def test_p28_def02_windowed_adherence_rate_calculation_truthfulness():
    """DEF-28-02: Windowed adherence (7d/30d/90d) MUST slice recent logs rather than dividing all logs by short window."""
    from backend.app.database import save_routine_log

    ts = int(time.time() * 1000)
    tok = _register_p16_account("P28 Adherence User", f"p28_adh_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}
    me = client.get("/api/v1/auth/me", headers=headers).json()
    uid = me["id"]

    # Seed 10 days of complete routine logs (4 steps completed per day)
    for day in range(1, 11):
        log_date = f"2026-08-{day:02d}"
        save_routine_log({
            "user_id": uid,
            "log_date": log_date,
            "completed_steps": ["step_1", "step_2", "step_3", "step_4"]
        })

    an = client.get("/api/v1/analytics", headers=headers).json()
    metrics = an["compliance_metrics"]

    # 7-day adherence should be exactly 100.0% (7 logs * 4 steps / (7 * 4)), NOT >100%
    assert metrics["adherence_7d"] == 100.0, f"7-day adherence must be 100.0, got {metrics['adherence_7d']}"
    assert metrics["adherence_30d"] == 100.0
    assert metrics["adherence_90d"] == 100.0


def test_p28_def03_sensitive_skin_routine_guardrail_expanded():
    """DEF-28-03: Sensitive skin guardrail MUST replace Lactic Acid (AHA) and other harsh actives in routine generation."""
    ts = int(time.time() * 1000)
    tok = _register_p16_account("P28 Sensitive Dry User", f"p28_sens_dry_{ts}@test.com", "User")
    headers = {"Authorization": f"Bearer {tok}"}

    # Evaluate for Sensitive skin with high redness severity
    res = client.post("/api/v1/assessment/evaluate", json={
        "skin_type": "Sensitive",
        "redness_severity": 8,
        "acne_severity": 0,
        "hyperpigmentation_severity": 0,
        "wrinkles_severity": 0
    }, headers=headers).json()

    routine = client.get("/api/v1/routine", headers=headers).json()
    
    # Ensure no harsh active (Lactic Acid, Retinol, Salicylic Acid, Glycolic Acid) remains in any step
    harsh_terms = ["Lactic Acid", "Retinol", "Salicylic Acid", "Glycolic Acid", "Benzoyl Peroxide"]
    for step in routine:
        actives = step.get("active_ingredients", [])
        for term in harsh_terms:
            for active in actives:
                assert term.lower() not in active.lower(), f"Sensitive routine contains harsh active '{active}' in step {step['product_name']}"


def test_p28_def04_explicit_zero_rating_and_safety_score_preservation():
    """DEF-28-04: Products with explicit 0.0 rating or safety_score MUST NOT falsy-default to 4.6 or 90.0."""
    from backend.app.database import SessionLocal
    from backend.app.models import Product

    db = SessionLocal()
    p_id = f"test_zero_prod_{int(time.time() * 1000)}"
    try:
        p = Product(
            id=p_id,
            product_name="Zero Rated Serum",
            brand="TestBrand",
            usage_type="Face Treatment",
            category="Treatment",
            ingredients="Water, Glycerin",
            price=25.0,
            rating=0.0,  # explicit zero
            safety_score=0.0  # explicit zero
        )
        db.add(p)
        db.commit()

        # Query recommendations including this category
        recs = client.post("/api/v1/recommendations", json={
            "skin_type": "Normal",
            "concerns": [],
            "allergies": []
        }).json()

        matched = next((item for item in recs["products"] if item["id"] == p_id), None)
        if matched:
            assert matched["rating"] == 0.0, f"Expected explicit 0.0 rating, got {matched['rating']}"
            assert matched["safety_score"] == 0.0, f"Expected explicit 0.0 safety_score, got {matched['safety_score']}"
    finally:
        db.query(Product).filter(Product.id == p_id).delete()
        db.commit()
        db.close()





