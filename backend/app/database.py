import json
import os
from typing import Dict, Any, List
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool, QueuePool
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

# ── Engine Configuration ──────────────────────────────────────────────────────
# SQLite: single-file local development — requires check_same_thread=False
# PostgreSQL: production — use QueuePool with appropriate sizing
_is_sqlite = "sqlite" in DATABASE_URL

if _is_sqlite:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # PostgreSQL production connection pool
    engine = create_engine(
        DATABASE_URL,
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
        pool_pre_ping=True,        # verify connections before use (detects stale connections)
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),  # recycle after 30 min
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def _run_migrations():
    """Ensure newly added columns and product datasets exist."""
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check users table columns
            if _is_sqlite:
                result = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                existing_cols = {row[1] for row in result}
                if "social_provider" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN social_provider VARCHAR"))
                if "social_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN social_id VARCHAR"))
                if "avatar_url" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))

                # Check skin_concerns_guide table columns
                guide_result = conn.execute(text("PRAGMA table_info(skin_concerns_guide)")).fetchall()
                guide_cols = {row[1] for row in guide_result}
                if "derma_referral_triggers" not in guide_cols:
                    conn.execute(text("ALTER TABLE skin_concerns_guide ADD COLUMN derma_referral_triggers TEXT"))
                if "derma_referral_threshold" not in guide_cols:
                    conn.execute(text("ALTER TABLE skin_concerns_guide ADD COLUMN derma_referral_threshold TEXT"))
                conn.commit()
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS social_provider VARCHAR;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS social_id VARCHAR;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;"))
                conn.execute(text("ALTER TABLE skin_concerns_guide ADD COLUMN IF NOT EXISTS derma_referral_triggers TEXT;"))
                conn.execute(text("ALTER TABLE skin_concerns_guide ADD COLUMN IF NOT EXISTS derma_referral_threshold TEXT;"))
                conn.commit()
    except Exception as e:
        pass

_run_migrations()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> bool:
    """Return True if database is reachable, False otherwise."""
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

# ── Routine Log Store (JSON file, local only) ─────────────────────────────────
ROUTINE_LOGS_FILE = "backend/app/data/routine_logs.json"

def _ensure_log_file():
    os.makedirs(os.path.dirname(ROUTINE_LOGS_FILE), exist_ok=True)
    if not os.path.exists(ROUTINE_LOGS_FILE):
        with open(ROUTINE_LOGS_FILE, "w") as f:
            json.dump([], f)

def save_routine_log(log_entry: Dict[str, Any]):
    _ensure_log_file()
    logs = []
    try:
        with open(ROUTINE_LOGS_FILE, "r") as f:
            logs = json.load(f)
    except (json.JSONDecodeError, ValueError):
        logs = []
    
    updated = False
    for i, log in enumerate(logs):
        if log.get("user_id") == log_entry.get("user_id") and log.get("log_date") == log_entry.get("log_date"):
            logs[i] = log_entry
            updated = True
            break
    if not updated:
        logs.append(log_entry)
        
    with open(ROUTINE_LOGS_FILE, "w") as f:
        json.dump(logs, f, indent=2)

def get_routine_logs(user_id: str) -> List[Dict[str, Any]]:
    _ensure_log_file()
    try:
        with open(ROUTINE_LOGS_FILE, "r") as f:
            logs = json.load(f)
        return [l for l in logs if isinstance(l, dict) and l.get("user_id") == user_id]
    except (json.JSONDecodeError, ValueError):
        with open(ROUTINE_LOGS_FILE, "w") as f:
            json.dump([], f)
        return []
