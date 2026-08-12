import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# ── Static SPA Mount & Fallback Routing ────────────────────────────────────────
# Try multiple possible dist/ locations to cover Railway's deployment layout
_this_file = os.path.abspath(__file__)  # e.g. /app/backend/app/main.py
_app_root = os.path.dirname(os.path.dirname(os.path.dirname(_this_file)))  # /app

_candidate_dirs = [
    os.path.join(_app_root, "dist"),                                   # /app/dist (from 3 dirs up __file__)
    os.path.join(os.path.dirname(_this_file), "..", "..", "dist"),     # relative from backend/app
    os.path.join(os.getcwd(), "dist"),                                  # cwd/dist
    os.path.join(os.path.dirname(os.getcwd()), "dist"),                # parent of cwd / dist
    "/app/dist",                                                        # Railway absolute
    "/dist",                                                            # fallback root
]

DIST_DIR = None
for _candidate in _candidate_dirs:
    _normalized = os.path.normpath(_candidate)
    if os.path.isdir(_normalized) and os.path.isfile(os.path.join(_normalized, "index.html")):
        DIST_DIR = _normalized
        logger.info(f"SPA dist/ found at: {DIST_DIR}")
        break

if not DIST_DIR:
    logger.warning(f"SPA dist/ NOT found. Checked: {[os.path.normpath(c) for c in _candidate_dirs]}")

if DIST_DIR:
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_or_fallback(full_path: str):
        # Don't intercept API routes or docs
        if full_path.startswith("api/") or full_path in ["docs", "openapi.json", "redoc", "debug-paths"]:
            return JSONResponse(status_code=404, content={"detail": "Not Found"})

        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)

        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)

        return JSONResponse(status_code=404, content={"detail": "SPA index.html not found"})

# Debug endpoint — always registered regardless of dist/ presence
@app.get("/debug-paths", tags=["Debug"], include_in_schema=False)
def debug_paths():
    """Diagnose static file path resolution on Railway dynamically."""
    live_this_file = os.path.abspath(__file__)
    live_app_root = os.path.dirname(os.path.dirname(os.path.dirname(live_this_file)))
    
    live_candidates = [
        os.path.join(live_app_root, "dist"),
        os.path.join(os.path.dirname(live_this_file), "..", "..", "dist"),
        os.path.join(os.getcwd(), "dist"),
        os.path.join(os.path.dirname(os.getcwd()), "dist"),
        "/app/dist",
        "/dist",
        "/app/backend/dist",
    ]
    
    app_dir_contents = []
    try:
        if os.path.isdir("/app"):
            app_dir_contents = os.listdir("/app")
    except Exception as e:
        app_dir_contents = [str(e)]
        
    cwd_contents = []
    try:
        cwd_contents = os.listdir(os.getcwd())
    except Exception as e:
        cwd_contents = [str(e)]

    return {
        "cwd": os.getcwd(),
        "cwd_contents": cwd_contents[:20],
        "app_dir_contents": app_dir_contents[:20],
        "this_file": live_this_file,
        "app_root": live_app_root,
        "dist_dir_used": DIST_DIR,
        "live_candidates_checked": {os.path.normpath(c): os.path.isdir(os.path.normpath(c)) for c in live_candidates},
        "dist_index_exists": DIST_DIR is not None and os.path.isfile(os.path.join(DIST_DIR, "index.html")),
    }

if not DIST_DIR:
    @app.get("/")
    def root():
        return {
            "status": "online",
            "service": "Miracle AI Skincare Intelligence Platform API",
            "version": "1.0.0",
            "documentation": "/docs"
        }
