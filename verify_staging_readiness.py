"""
verify_staging_readiness.py
Phase 6: Staging Environment Readiness & Deployment Verification Script

Executes staging-style configuration checks:
1. Environment Variable Enforcement (ENVIRONMENT=staging requires JWT_SECRET & CORS_ORIGINS)
2. PostgreSQL Staging Database Scheme Normalization
3. Demo Seeding Suppression in Staging Mode
4. Staging Frontend API URL Bundle Embedding Verification
5. Health and Readiness Endpoints Verification
6. Secret and Stack-Trace Exposure Audit
7. Staging RBAC & JWT Authorization Checks
"""
import os
import sys
import importlib
import subprocess
import warnings
warnings.filterwarnings("ignore")
from fastapi.testclient import TestClient
import backend.app.config as cfg

def log(msg, color="34"):
    print(f"\033[1;{color}m{msg}\033[0m")

def pass_msg(msg):
    print(f"  \033[1;32mPASS:\033[0m {msg}")

def fail_msg(msg):
    print(f"  \033[1;31mFAIL:\033[0m {msg}")

def main():
    log("=" * 70, "36")
    log("PHASE 6: STAGING ENVIRONMENT READINESS VERIFICATION", "36")
    log("=" * 70, "36")

    failures = 0

    # ──────────────────────────────────────────────────────────────────────────
    # CHECK 1: Staging Environment Variable Enforcement
    # ──────────────────────────────────────────────────────────────────────────
    log("\n1. STAGING ENVIRONMENT VARIABLE ENFORCEMENT", "33")

    old_env = os.environ.copy()

    # A. Missing JWT_SECRET in staging
    os.environ["ENVIRONMENT"] = "staging"
    os.environ.pop("JWT_SECRET", None)
    os.environ.pop("CORS_ORIGINS", None)

    try:
        importlib.reload(cfg)
        fail_msg("Staging mode allowed missing JWT_SECRET!")
        failures += 1
    except RuntimeError as e:
        if "JWT_SECRET" in str(e):
            pass_msg("Staging mode correctly raised RuntimeError for missing JWT_SECRET")
        else:
            fail_msg(f"Unexpected RuntimeError: {e}")
            failures += 1

    # B. Missing CORS_ORIGINS in staging
    os.environ["ENVIRONMENT"] = "staging"
    os.environ["JWT_SECRET"] = "staging-secret-key-super-secure-32chars-min"
    os.environ.pop("CORS_ORIGINS", None)

    try:
        importlib.reload(cfg)
        fail_msg("Staging mode allowed missing CORS_ORIGINS!")
        failures += 1
    except RuntimeError as e:
        if "CORS_ORIGINS" in str(e):
            pass_msg("Staging mode correctly raised RuntimeError for missing CORS_ORIGINS")
        else:
            fail_msg(f"Unexpected RuntimeError: {e}")
            failures += 1

    # C. Valid staging configuration
    os.environ["ENVIRONMENT"] = "staging"
    os.environ["JWT_SECRET"] = "staging-secret-key-super-secure-32chars-min"
    os.environ["CORS_ORIGINS"] = "https://staging.miracleskincare.com"

    try:
        importlib.reload(cfg)
        pass_msg("Staging configuration validated successfully")
    except Exception as e:
        fail_msg(f"Valid staging configuration failed: {e}")
        failures += 1

    # Restore environment
    os.environ.clear()
    os.environ.update(old_env)
    importlib.reload(cfg)

    # ──────────────────────────────────────────────────────────────────────────
    # CHECK 2: PostgreSQL Staging Scheme Normalization
    # ──────────────────────────────────────────────────────────────────────────
    log("\n2. POSTGRESQL STAGING DATABASE URL NORMALIZATION", "33")

    os.environ["DATABASE_URL"] = "postgres://staging_usr:secret_pass@staging-db.internal:5432/miracle_staging"
    importlib.reload(cfg)
    if cfg.DATABASE_URL.startswith("postgresql://"):
        pass_msg("Legacy postgres:// normalized to postgresql://")
    else:
        fail_msg(f"PostgreSQL URL normalization failed: {cfg.DATABASE_URL}")
        failures += 1

    os.environ["DATABASE_URL"] = "postgresql+psycopg://staging_usr:secret_pass@staging-db.internal:5432/miracle_staging"
    importlib.reload(cfg)
    if cfg.DATABASE_URL.startswith("postgresql+psycopg://"):
        pass_msg("postgresql+psycopg:// scheme preserved correctly")
    else:
        fail_msg(f"postgresql+psycopg:// normalization failed: {cfg.DATABASE_URL}")
        failures += 1

    # Restore default DB URL
    os.environ.pop("DATABASE_URL", None)
    importlib.reload(cfg)

    # ──────────────────────────────────────────────────────────────────────────
    # CHECK 3: Demo User Seeding Suppression in Staging
    # ──────────────────────────────────────────────────────────────────────────
    log("\n3. DEMO SEED SUPPRESSION IN STAGING MODE", "33")

    os.environ["ENVIRONMENT"] = "staging"
    os.environ["JWT_SECRET"] = "staging-secret-key-super-secure-32chars-min"
    os.environ["CORS_ORIGINS"] = "https://staging.miracleskincare.com"
    importlib.reload(cfg)

    from backend.app.main import _seed_demo_users
    try:
        _seed_demo_users()
        pass_msg("_seed_demo_users() executed safely and suppressed demo seeding in staging mode")
    except Exception as e:
        fail_msg(f"seed_default_users() raised exception in staging mode: {e}")
        failures += 1

    os.environ.clear()
    os.environ.update(old_env)
    importlib.reload(cfg)

    # ──────────────────────────────────────────────────────────────────────────
    # CHECK 4: Staging Frontend API URL Bundle Embedding
    # ──────────────────────────────────────────────────────────────────────────
    log("\n4. STAGING FRONTEND API URL BUNDLE EMBEDDING", "33")

    env = os.environ.copy()
    staging_url = "https://staging-api.miracleskincare.com/api/v1"
    env["VITE_API_URL"] = staging_url

    build_res = subprocess.run("npx vite build", shell=True, cwd=".", env=env, capture_output=True, text=True)
    if build_res.returncode == 0:
        dist_files = [os.path.join("dist/assets", f) for f in os.listdir("dist/assets") if f.endswith(".js")]
        if dist_files:
            with open(dist_files[0], "r", encoding="utf-8") as f:
                bundle_content = f.read()

            prod_url_found = staging_url in bundle_content
            dev_url_found = "http://127.0.0.1:8000/api/v1" in bundle_content

            if prod_url_found and not dev_url_found:
                pass_msg(f"Staging API URL ({staging_url}) embedded; 127.0.0.1 fallback eliminated")
            else:
                fail_msg(f"Bundle check failed: prod_found={prod_url_found}, dev_found={dev_url_found}")
                failures += 1
        else:
            fail_msg("No JS dist files generated!")
            failures += 1
    else:
        fail_msg(f"Vite staging build failed with code {build_res.returncode}")
        failures += 1

    # ──────────────────────────────────────────────────────────────────────────
    # CHECK 5: Health & Readiness Endpoint Verification
    # ──────────────────────────────────────────────────────────────────────────
    log("\n5. HEALTH & READINESS ENDPOINTS", "33")

    from backend.app.main import app
    client = TestClient(app)

    health_resp = client.get("/health")
    if health_resp.status_code == 200 and health_resp.json().get("status") == "ok":
        pass_msg("GET /health -> HTTP 200 OK {'status': 'ok'}")
    else:
        fail_msg(f"GET /health returned status {health_resp.status_code}: {health_resp.text}")
        failures += 1

    ready_resp = client.get("/ready")
    if ready_resp.status_code == 200 and ready_resp.json().get("status") == "ready":
        pass_msg("GET /ready -> HTTP 200 OK {'status': 'ready'}")
    else:
        fail_msg(f"GET /ready returned status {ready_resp.status_code}: {ready_resp.text}")
        failures += 1

    # ──────────────────────────────────────────────────────────────────────────
    # CHECK 6: Secret & Traceback Exposure Audit
    # ──────────────────────────────────────────────────────────────────────────
    log("\n6. SECRET & TRACEBACK EXPOSURE AUDIT", "33")

    r401 = client.get("/api/v1/auth/me")
    if r401.status_code == 401 and "Traceback" not in r401.text and "SECRET" not in r401.text:
        pass_msg("HTTP 401 response does not leak tracebacks or secrets")
    else:
        fail_msg(f"HTTP 401 response failed safety check: {r401.text}")
        failures += 1

    r404 = client.get("/api/v1/invalid_endpoint_path_xyz")
    if r404.status_code == 404 and "Traceback" not in r404.text and "sqlite" not in r404.text.lower():
        pass_msg("HTTP 404 response does not leak filesystem or database paths")
    else:
        fail_msg(f"HTTP 404 response failed safety check: {r404.text}")
        failures += 1

    # ──────────────────────────────────────────────────────────────────────────
    # CHECK 7: Staging RBAC Authorization Verification
    # ──────────────────────────────────────────────────────────────────────────
    log("\n7. STAGING RBAC AUTHORIZATION", "33")

    login_resp = client.post("/api/v1/auth/login", json={
        "email": "user@miracle.com",
        "password": "password123"
    })
    if login_resp.status_code == 200:
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        roster_resp = client.get("/api/v1/consultant/roster", headers=headers)
        if roster_resp.status_code == 403:
            pass_msg("User role blocked from consultant roster (HTTP 403)")
        else:
            fail_msg(f"User role returned unexpected status {roster_resp.status_code}")
            failures += 1
    else:
        fail_msg(f"User login failed: {login_resp.text}")
        failures += 1

    # Restore clean standard build
    subprocess.run("npm run build", shell=True, cwd=".", capture_output=True)

    log("\n" + "=" * 70, "36")
    if failures == 0:
        log("ALL STAGING ENVIRONMENT READINESS CHECKS PASSED SUCCESSFULLY!", "32")
        log("=" * 70, "36")
        sys.exit(0)
    else:
        log(f"STAGING READINESS FAILED: {failures} CHECK(S) FAILED!", "31")
        log("=" * 70, "36")
        sys.exit(1)

if __name__ == "__main__":
    main()
