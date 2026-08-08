import os
import logging

logger = logging.getLogger("miracle.config")

ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
IS_PRODUCTION = ENVIRONMENT in ["production", "prod", "staging", "stage"]

# ── JWT Secret ───────────────────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET")

if not JWT_SECRET:
    if IS_PRODUCTION:
        raise RuntimeError(
            "CRITICAL: JWT_SECRET environment variable is required in production. "
            "Set a cryptographically random value of at least 32 characters."
        )
    SECRET_KEY = "miracle-secret-key-super-secure-2026"
else:
    SECRET_KEY = JWT_SECRET

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# ── Database URL ─────────────────────────────────────────────────────────────
db_url = os.getenv("DATABASE_URL", "sqlite:///./miracle.db")

# Normalize legacy Heroku-style postgres:// → postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if IS_PRODUCTION and db_url.startswith("sqlite"):
    logger.warning(
        "WARNING: SQLite is configured as DATABASE_URL in production mode. "
        "SQLite is not recommended for production. "
        "Set DATABASE_URL to a PostgreSQL connection string."
    )

DATABASE_URL = db_url

# ── CORS Origins ─────────────────────────────────────────────────────────────
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "")

if IS_PRODUCTION and not CORS_ORIGINS_RAW.strip():
    raise RuntimeError(
        "CRITICAL: CORS_ORIGINS environment variable is required in production. "
        "Set a comma-separated list of allowed frontend origins, "
        "e.g. CORS_ORIGINS=https://your-frontend-domain.com"
    )

# ── Startup checks summary (never log secrets) ────────────────────────────────
def log_startup_summary():
    db_summary = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    logger.info(f"Environment: {ENVIRONMENT}")
    logger.info(f"Database:    {db_summary}")
    logger.info(f"JWT Secret:  {'[from env]' if JWT_SECRET else '[development fallback]'}")
    logger.info(f"CORS Origins: {CORS_ORIGINS_RAW[:80] if CORS_ORIGINS_RAW else '[localhost defaults]'}")
