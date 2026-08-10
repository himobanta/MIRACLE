"""
test_deployment_config.py
Phase 3 regression tests for:
- Production environment variable enforcement
- Health / readiness endpoints
- Error handling safety (no secret leakage)
- PostgreSQL URL normalization
- SQLite local development compatibility
- Database connectivity check
"""
import os
import pytest
from fastapi.testclient import TestClient


# ── Production configuration enforcement ──────────────────────────────────────

def test_production_requires_jwt_secret(monkeypatch):
    """Production mode MUST raise RuntimeError if JWT_SECRET is missing."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("JWT_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        import importlib
        import backend.app.config as cfg
        importlib.reload(cfg)


def test_production_requires_cors_origins(monkeypatch):
    """Production mode MUST raise RuntimeError if CORS_ORIGINS is missing."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "test-secret-abc123def456ghi789jkl0")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        import importlib
        import backend.app.config as cfg
        importlib.reload(cfg)


def test_development_mode_allows_missing_jwt_secret(monkeypatch):
    """Development mode MUST NOT raise even when JWT_SECRET is missing."""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    import importlib
    import backend.app.config as cfg
    importlib.reload(cfg)
    assert cfg.SECRET_KEY == "miracle-secret-key-super-secure-2026"


# ── PostgreSQL URL normalization ───────────────────────────────────────────────

def test_postgres_url_normalization(monkeypatch):
    """Legacy postgres:// scheme MUST be normalized to postgresql://."""
    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@host:5432/db")
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("JWT_SECRET", raising=False)
    import importlib
    import backend.app.config as cfg
    importlib.reload(cfg)
    assert cfg.DATABASE_URL.startswith("postgresql://")
    assert not cfg.DATABASE_URL.startswith("postgres://")


def test_postgresql_plus_psycopg_url_unchanged(monkeypatch):
    """postgresql+psycopg:// URLs must be kept as-is."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@host:5432/db")
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("JWT_SECRET", raising=False)
    import importlib
    import backend.app.config as cfg
    importlib.reload(cfg)
    assert cfg.DATABASE_URL.startswith("postgresql+psycopg://")


def test_sqlite_url_preserved_in_development(monkeypatch):
    """SQLite DATABASE_URL must be unchanged in development mode."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./miracle.db")
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("JWT_SECRET", raising=False)
    import importlib
    import backend.app.config as cfg
    importlib.reload(cfg)
    assert cfg.DATABASE_URL == "sqlite:///./miracle.db"


# ── Health and readiness endpoints ────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    from backend.app.main import app
    return TestClient(app)


def test_health_endpoint_returns_200(client):
    """GET /health must return HTTP 200 with minimal status payload."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"
    # Must NOT expose internal secrets or configuration
    resp_text = resp.text
    assert "JWT" not in resp_text
    assert "SECRET" not in resp_text
    assert "password" not in resp_text.lower()
    assert "DATABASE_URL" not in resp_text


def test_readiness_endpoint_returns_200_with_sqlite(client):
    """GET /ready must return HTTP 200 when database (SQLite) is reachable."""
    resp = client.get("/ready")
    assert resp.status_code in [200, 503]
    data = resp.json()
    # Must have status field
    assert "status" in data
    # Must NOT expose credentials regardless of result
    resp_text = resp.text
    assert "password" not in resp_text.lower()
    assert "SECRET" not in resp_text


def test_root_endpoint_returns_200(client):
    """GET / must return HTTP 200 with service info."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "online"


# ── Error handling: no secret leakage ─────────────────────────────────────────

def test_404_error_does_not_expose_internals(client):
    """Non-existent endpoint must return 404, not traceback."""
    resp = client.get("/api/v1/nonexistent_route_that_does_not_exist")
    assert resp.status_code == 404
    resp_text = resp.text
    assert "Traceback" not in resp_text
    assert "SECRET" not in resp_text
    assert "sqlite" not in resp_text.lower()
    assert "hashed_password" not in resp_text


def test_no_sensitive_data_in_error_responses(client):
    """Malformed requests must return clean error responses."""
    # Missing required fields → 422 Unprocessable Entity
    resp = client.post("/api/v1/auth/login", json={"not_email": "x"})
    assert resp.status_code == 422
    resp_text = resp.text
    assert "Traceback" not in resp_text
    assert "SECRET" not in resp_text
    assert "hashed_password" not in resp_text


def test_invalid_credentials_does_not_leak_hash(client):
    """HTTP 401 response must not expose password hash or internal state."""
    resp = client.post("/api/v1/auth/login", json={"email": "nobody@test.com", "password": "wrong"})
    assert resp.status_code == 401
    resp_text = resp.text
    assert "$argon2" not in resp_text
    assert "hashed_password" not in resp_text
    assert "Traceback" not in resp_text


# ── Database connectivity ──────────────────────────────────────────────────────

def test_check_db_connection_returns_bool():
    """check_db_connection() must return a boolean, not raise."""
    from backend.app.database import check_db_connection
    result = check_db_connection()
    assert isinstance(result, bool)
    assert result is True  # SQLite should be reachable locally


# ── CORS Preflight & Origin Tests ──────────────────────────────────────────────

def test_cors_preflight_options_login(client):
    """OPTIONS request to /api/v1/auth/login with Origin: http://localhost:5173 must return CORS headers."""
    resp = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "POST" in resp.headers.get("access-control-allow-methods", "")


def test_cors_preflight_options_register(client):
    """OPTIONS request to /api/v1/auth/register with Origin: http://127.0.0.1:5173 must return CORS headers."""
    resp = client.options(
        "/api/v1/auth/register",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"

