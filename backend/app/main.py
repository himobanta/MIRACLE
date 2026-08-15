import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base, SessionLocal, check_db_connection
from .models import User, UserProfile, SystemConfig, ContentArticle, Ingredient, BackupRecord
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
from .routers import admin_extended_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("miracle.app")

# Create database tables (idempotent — safe for both SQLite and PostgreSQL)
Base.metadata.create_all(bind=engine)


def _seed_demo_users():
    """Seed demo accounts if they don't already exist.
    Safe to run in any environment — idempotent (creates only if missing).

    Demo credentials:
      user@miracle.com         / password123   (User)
      consultant@miracle.com   / password123   (Skincare Consultant)
      dermatologist@miracle.com/ password123   (Dermatologist)
      admin@miracle.com        / password123   (Administrator)
      derma@miracle.com        / doctor123     (Dermatologist — legacy alias)
    """
    log_startup_summary()
    logger.info(f"Environment: {ENVIRONMENT} — seeding demo accounts if missing...")
    db = SessionLocal()
    try:
        # ── Demo User ─────────────────────────────────────────────────────────
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
            profile = UserProfile(
                user_id=user.id,
                skin_type="Oily",
                concerns=["Acne", "Pigmentation"]
            )
            db.add(profile)
            db.commit()
            logger.info("Seeded demo User: user@miracle.com")

        # ── Demo Skincare Consultant ───────────────────────────────────────────
        if not db.query(User).filter(User.email == "consultant@miracle.com").first():
            consultant = User(
                name="Priya Sharma",
                email="consultant@miracle.com",
                hashed_password=hash_password("password123"),
                role="Skincare Consultant"
            )
            db.add(consultant)
            db.commit()
            db.refresh(consultant)
            profile = UserProfile(user_id=consultant.id)
            db.add(profile)
            db.commit()
            logger.info("Seeded demo Skincare Consultant: consultant@miracle.com")

        # ── Demo Dermatologist (canonical) ────────────────────────────────────
        if not db.query(User).filter(User.email == "dermatologist@miracle.com").first():
            dermatologist = User(
                name="Dr. Kavita Nair",
                email="dermatologist@miracle.com",
                hashed_password=hash_password("password123"),
                role="Dermatologist"
            )
            db.add(dermatologist)
            db.commit()
            db.refresh(dermatologist)
            profile = UserProfile(user_id=dermatologist.id)
            db.add(profile)
            db.commit()
            logger.info("Seeded demo Dermatologist: dermatologist@miracle.com")

        # ── Demo Administrator ────────────────────────────────────────────────
        existing_admin = db.query(User).filter(User.email == "admin@miracle.com").first()
        if not existing_admin:
            admin = User(
                name="Himobanta Dutta",
                email="admin@miracle.com",
                hashed_password=hash_password("password123"),
                role="Administrator"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            profile = UserProfile(user_id=admin.id)
            db.add(profile)
            db.commit()
            logger.info("Seeded demo Administrator: admin@miracle.com (Himobanta Dutta)")
        else:
            if existing_admin.name != "Himobanta Dutta":
                existing_admin.name = "Himobanta Dutta"
                db.commit()
                logger.info("Updated demo Administrator name to: Himobanta Dutta")

        # ── Legacy Dermatologist alias (backward compatibility) ───────────────
        if not db.query(User).filter(User.email == "derma@miracle.com").first():
            doctor = User(
                name="Dr. Meera Vasudevan",
                email="derma@miracle.com",
                hashed_password=hash_password("doctor123"),
                role="Dermatologist"
            )
            db.add(doctor)
            db.commit()
            logger.info("Seeded legacy Dermatologist alias: derma@miracle.com")
    finally:
        db.close()


def _seed_demo_content():
    """Seed default system settings, sample content articles, ingredients, and a backup record.
    Idempotent — only inserts missing records.
    """
    db = SessionLocal()
    try:
        # ── 5 Default SystemConfig records ────────────────────────────────────
        default_configs = [
            {
                "key": "platform_name",
                "value": "MIRACLE",
                "category": "Platform",
                "description": "Display name of the platform",
            },
            {
                "key": "registration_enabled",
                "value": "true",
                "category": "Security",
                "description": "Allow new user self-registration",
            },
            {
                "key": "max_daily_assessments",
                "value": "10",
                "category": "Assessment",
                "description": "Maximum skin assessments a user can submit per day",
            },
            {
                "key": "session_timeout_hours",
                "value": "168",
                "category": "Security",
                "description": "JWT access token lifetime in hours (7 days default)",
            },
            {
                "key": "maintenance_mode",
                "value": "false",
                "category": "Platform",
                "description": "When true, non-admin users receive a maintenance notice",
            },
        ]
        for cfg in default_configs:
            if not db.query(SystemConfig).filter(SystemConfig.key == cfg["key"]).first():
                db.add(SystemConfig(**cfg))
        db.commit()

        # ── 3 Sample ContentArticle records ───────────────────────────────────
        sample_articles = [
            {
                "title": "The Complete Guide to Building a Skincare Routine",
                "body": "Building an effective skincare routine starts with understanding your skin type.",
                "category": "Skincare Guide",
                "status": "Published",
                "tags": ["beginner", "routine", "skincare"],
            },
            {
                "title": "Understanding Skin Types: Oily, Dry, Combination & Sensitive",
                "body": "Knowing your skin type is the foundation of any effective skincare regimen.",
                "category": "Research",
                "status": "Published",
                "tags": ["skin-type", "oily", "dry", "combination"],
            },
            {
                "title": "FAQ: Common Skincare Myths Debunked",
                "body": "From sunscreen myths to the truth about natural ingredients — we clear it all up.",
                "category": "FAQ",
                "status": "Published",
                "tags": ["faq", "myths", "sunscreen"],
            },
        ]
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for art in sample_articles:
            if not db.query(ContentArticle).filter(ContentArticle.title == art["title"]).first():
                db.add(ContentArticle(
                    title=art["title"],
                    body=art["body"],
                    category=art["category"],
                    status=art["status"],
                    tags=art["tags"],
                    published_at=now,
                ))
        db.commit()

        # ── 3 Sample Ingredient records ───────────────────────────────────────
        sample_ingredients = [
            {
                "name": "Niacinamide",
                "category": "Active",
                "function": "Brightening, Pore-minimizing, Barrier-repair",
                "description": "A form of Vitamin B3 that addresses multiple skin concerns simultaneously.",
                "benefits": ["Reduces pore appearance", "Evens skin tone", "Strengthens skin barrier", "Controls oil"],
                "concerns": ["May cause flushing at high concentrations (>10%)"],
                "skin_types": ["Oily", "Combination", "Dry", "Sensitive"],
                "avoid_with": ["High concentration Vitamin C (temporary)"],
                "safety_rating": "Safe",
            },
            {
                "name": "Salicylic Acid",
                "category": "Exfoliant",
                "function": "Beta Hydroxy Acid (BHA) — exfoliation and pore-clearing",
                "description": "An oil-soluble BHA that penetrates pores to dissolve sebum and dead skin cells.",
                "benefits": ["Unclogs pores", "Reduces blackheads", "Treats acne", "Smooths texture"],
                "concerns": ["Can cause dryness or irritation if overused", "Avoid during pregnancy"],
                "skin_types": ["Oily", "Acne-prone", "Combination"],
                "avoid_with": ["Other exfoliants (AHA/BHA)", "Retinol (without buffer)"],
                "safety_rating": "Safe",
            },
            {
                "name": "Hyaluronic Acid",
                "category": "Humectant",
                "function": "Deep hydration and moisture retention",
                "description": "A naturally occurring polysaccharide that can hold up to 1000x its weight in water.",
                "benefits": ["Intense hydration", "Plumps fine lines", "Suitable for all skin types", "Non-comedogenic"],
                "concerns": ["Can dehydrate skin in very low humidity environments without a sealant"],
                "skin_types": ["Dry", "Oily", "Combination", "Sensitive", "Normal"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
        ]
        for ing in sample_ingredients:
            if not db.query(Ingredient).filter(Ingredient.name == ing["name"]).first():
                db.add(Ingredient(**ing))
        db.commit()

        # ── 1 Sample BackupRecord ─────────────────────────────────────────────
        if db.query(BackupRecord).count() == 0:
            db.add(BackupRecord(
                status="Completed",
                backup_type="Automatic",
                notes="Initial system backup at platform launch",
                size_bytes=1024 * 512,  # 512 KB placeholder
                completed_at=now,
            ))
            db.commit()

        logger.info("Demo content seeded: SystemConfig, ContentArticles, Ingredients, BackupRecord")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app_: FastAPI):
    """FastAPI lifespan handler: runs startup logic before the app accepts requests."""
    _seed_demo_users()
    _seed_demo_content()
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
app.include_router(admin_extended_router.router)

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
    os.path.join(os.path.dirname(_this_file), "..", "dist"),           # /app/app/dist
    os.path.join(os.getcwd(), "dist"),                                  # cwd/dist
    os.path.join(os.getcwd(), "app", "dist"),                          # /app/app/dist
    os.path.join(os.path.dirname(os.getcwd()), "dist"),                # parent of cwd / dist
    "/app/dist",                                                        # Railway absolute
    "/app/app/dist",                                                    # Railway nested app/dist
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
