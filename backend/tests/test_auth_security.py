import os
import hashlib
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import User
from backend.app.auth import hash_password, is_legacy_sha256, verify_password
from backend.app.rate_limiter import limiter_login, limiter_register

client = TestClient(app)

def test_new_registration_creates_argon2id_hash():
    """
    Requirement A & F: New registration MUST use Argon2id and never store plaintext or legacy SHA-256.
    """
    ts = int(time_now())
    email = f"argon2_user_{ts}@miracle.com"
    pwd = "MySecretPassword123!"

    resp = client.post("/api/v1/auth/register", json={
        "name": "Argon2 User",
        "email": email,
        "password": pwd
    })
    assert resp.status_code == 200, f"Registration failed: {resp.text}"

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.hashed_password.startswith("$argon2id$"), f"Expected Argon2id hash, got: {user.hashed_password}"
        assert not is_legacy_sha256(user.hashed_password)
    finally:
        db.close()

def test_login_correct_and_incorrect_password():
    """
    Requirement B & C: Correct password returns 200 with JWT; wrong password returns 401.
    """
    ts = int(time_now())
    email = f"auth_test_{ts}@miracle.com"
    pwd = "ValidPassword123"

    client.post("/api/v1/auth/register", json={
        "name": "Auth Test",
        "email": email,
        "password": pwd
    })

    # Correct password
    login_ok = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert login_ok.status_code == 200
    assert "access_token" in login_ok.json()

    # Wrong password
    login_fail = client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword!"})
    assert login_fail.status_code == 401

def test_legacy_sha256_login_and_automatic_upgrade():
    """
    Requirement D & E: Existing SHA-256 users can log in, and successful login transparently
    upgrades their hash to Argon2id.
    """
    ts = int(time_now())
    email = f"legacy_user_{ts}@miracle.com"
    pwd = "LegacyPassword123"

    # Manually seed a legacy user with SHA-256 hash
    sha256_hash = hashlib.sha256(pwd.encode("utf-8")).hexdigest()
    assert is_legacy_sha256(sha256_hash)

    db = SessionLocal()
    try:
        user = User(
            name="Legacy User",
            email=email,
            hashed_password=sha256_hash,
            role="User"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()

    # Verify initial state in DB is legacy SHA-256
    db = SessionLocal()
    user_before = db.query(User).filter(User.id == user_id).first()
    assert is_legacy_sha256(user_before.hashed_password)
    db.close()

    # Login with legacy credentials
    limiter_login.reset()
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert resp.status_code == 200, f"Legacy login failed: {resp.text}"
    assert "access_token" in resp.json()

    # Verify DB has been upgraded to Argon2id
    db = SessionLocal()
    user_after = db.query(User).filter(User.id == user_id).first()
    assert user_after.hashed_password.startswith("$argon2id$"), f"Expected upgraded Argon2id, got: {user_after.hashed_password}"
    assert not is_legacy_sha256(user_after.hashed_password)
    db.close()

def test_login_rate_limiting_eventually_returns_429():
    """
    Requirement G: Excessive login attempts return HTTP 429.
    """
    limiter_login.reset()
    os.environ["AUTH_RATE_LIMIT_LOGIN"] = "3/minute"

    try:
        # Send 3 login requests
        for i in range(3):
            r = client.post("/api/v1/auth/login", json={"email": "ratelimit_login@test.com", "password": "wrong"})
            assert r.status_code in [401, 404]

        # 4th request must be blocked with HTTP 429
        blocked = client.post("/api/v1/auth/login", json={"email": "ratelimit_login@test.com", "password": "wrong"})
        assert blocked.status_code == 429
        assert "Rate limit exceeded" in blocked.json()["detail"]
    finally:
        os.environ.pop("AUTH_RATE_LIMIT_LOGIN", None)
        limiter_login.reset()

def test_register_rate_limiting_eventually_returns_429():
    """
    Requirement H: Excessive registration attempts return HTTP 429.
    """
    limiter_register.reset()
    os.environ["AUTH_RATE_LIMIT_REGISTER"] = "2/minute"

    try:
        # Send 2 register requests
        for i in range(2):
            r = client.post("/api/v1/auth/register", json={
                "name": f"RL Reg {i}",
                "email": f"rl_reg_{i}_{int(time_now())}@test.com",
                "password": "Password123!"
            })
            assert r.status_code == 200

        # 3rd request must be blocked with HTTP 429
        blocked = client.post("/api/v1/auth/register", json={
            "name": "RL Reg 3",
            "email": f"rl_reg_3_{int(time_now())}@test.com",
            "password": "Password123!"
        })
        assert blocked.status_code == 429
        assert "Rate limit exceeded" in blocked.json()["detail"]
    finally:
        os.environ.pop("AUTH_RATE_LIMIT_REGISTER", None)
        limiter_register.reset()

def test_normal_api_requests_unaffected_by_auth_rate_limiting():
    """
    Requirement I: Normal authenticated API requests are unaffected by authentication rate limiting.
    """
    limiter_login.reset()
    ts = int(time_now())
    email = f"normal_api_{ts}@miracle.com"
    pwd = "Password123!"

    reg = client.post("/api/v1/auth/register", json={"name": "Normal API", "email": email, "password": pwd})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Lock down login rate limiter to 1/minute
    os.environ["AUTH_RATE_LIMIT_LOGIN"] = "1/minute"
    limiter_login.reset()
    client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    login_blocked = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert login_blocked.status_code == 429

    # Authenticated endpoints must still respond HTTP 200 without being rate-limited
    for _ in range(5):
        me_resp = client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200

        rec_resp = client.get("/api/v1/recommendations", headers=headers)
        assert rec_resp.status_code == 200
    os.environ.pop("AUTH_RATE_LIMIT_LOGIN", None)
    limiter_login.reset()

def test_no_password_hashes_in_api_responses():
    """
    Security check: Password hashes or plaintext passwords are never returned in API payloads.
    """
    ts = int(time_now())
    email = f"sec_check_{ts}@miracle.com"
    pwd = "SecretPassword123"

    reg = client.post("/api/v1/auth/register", json={"name": "Sec Check", "email": email, "password": pwd})
    data = reg.json()
    assert "hashed_password" not in data
    assert "password" not in data

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    me = client.get("/api/v1/auth/me", headers=headers)
    me_data = me.json()
    assert "hashed_password" not in me_data
    assert "password" not in me_data

def time_now():
    import time
    return time.time()
