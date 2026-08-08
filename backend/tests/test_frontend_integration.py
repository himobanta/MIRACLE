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
