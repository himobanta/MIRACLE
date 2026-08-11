import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal, check_db_connection
from .models import User, UserProfile
from .auth import hash_password
from .config import CORS_ORIGINS_RAW, ENVIRONMENT, log_startup_summary
from .routers import (
    auth_router,
    assessment_router,
    routine_router,
    ingredient_router,
    recommendation_router,
    analytics_router,
    consultant_router,
    appointment_router
)
from .routers import admin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("miracle.app")

# Create database tables (idempotent — safe for both SQLite and PostgreSQL)
Base.metadata.create_all(bind=engine)


def _seed_demo_users():
    """Seed development-only demo accounts if they don't already exist.
    NEVER runs in production or staging environments.
    """
    log_startup_summary()
    if ENVIRONMENT in ["production", "prod", "staging", "stage"]:
        logger.info("Production/Staging mode: skipping demo user seeding.")
        return
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "user@miracle.com").first():
            user = User(
                name="Ananya Sharma",
                email="user@miracle.com",
                hashed_password=hash_password("password123"),
                role="User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            profile = UserProfile(user_id=user.id, skin_type="Oily", concerns=["Acne", "Pigmentation"])
            db.add(profile)
            db.commit()

        if not db.query(User).filter(User.email == "derma@miracle.com").first():
            doctor = User(
                name="Dr. Meera Vasudevan",
                email="derma@miracle.com",
                hashed_password=hash_password("doctor123"),
                role="Dermatologist"
            )
            db.add(doctor)
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app_: FastAPI):
    """FastAPI lifespan handler: runs startup logic before the app accepts requests."""
    _seed_demo_users()
    yield
    # Shutdown: no cleanup required for SQLAlchemy connection pool disposal


app = FastAPI(
    title="Miracle AI Skincare Intelligence & Planner API",
    description="Full-Stack Backend Engine for Skin Assessment, Scoring, Routine Generation, Product Recommendation, and Doctor Portals",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

allowed_origins = list(default_origins)

if CORS_ORIGINS_RAW.strip():
    parsed_origins = [
        origin.strip().rstrip("/")
        for origin in CORS_ORIGINS_RAW.split(",")
        if origin.strip()
    ]
    for origin in parsed_origins:
        if origin and origin not in allowed_origins:
            allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global production-safe exception handler ──────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler: never expose tracebacks, paths, DB URLs, or stack traces in production.
    """
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {type(exc).__name__}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(assessment_router.router)
app.include_router(routine_router.router)
app.include_router(ingredient_router.router)
app.include_router(recommendation_router.router)
app.include_router(analytics_router.router)
app.include_router(consultant_router.router)
app.include_router(appointment_router.router)
app.include_router(admin_router.router)

# ── Health & Readiness Endpoints ──────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe: returns 200 when the application is alive."""
    return {"status": "ok", "service": "miracle-api"}

@app.get("/ready", tags=["Health"])
def readiness_check():
    """
    Readiness probe: verifies database connectivity.
    Returns 200 if ready, 503 if database is unreachable.
    Never exposes connection strings or credentials.
    """
    db_ok = check_db_connection()
    if db_ok:
        return {"status": "ready", "database": "connected"}
    return JSONResponse(
        status_code=503,
        content={"status": "not ready", "database": "unreachable"}
    )

# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Miracle AI Skincare Intelligence Platform API",
        "version": "1.0.0",
        "documentation": "/docs"
    }
