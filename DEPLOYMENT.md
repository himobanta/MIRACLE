# Miracle — Staging & Production Deployment Guide

This document contains step-by-step instructions for deploying Miracle to a staging or production server.

---

## 1. Architecture Overview

- **Backend**: FastAPI app (`backend.app.main:app`), executed via Uvicorn or Gunicorn with Uvicorn workers.
- **Frontend**: Single Page Application built with Vite and React, compiled to static files in `dist/`.
- **Database**: PostgreSQL (production/staging) or SQLite (local development fallback).
- **Authentication**: JWT bearer tokens + Argon2id password hashing + automatic SHA-256 legacy hash migration.

---

## 2. Prerequisites

- **Python**: 3.10+
- **Node.js**: 18+ & `npm` 9+
- **PostgreSQL**: 14+ (for staging/production)
- **Reverse Proxy**: Nginx or Caddy with SSL/TLS certificates

---

## 3. Environment Variables Reference

Configure these on your server or hosting platform environment settings.

### Backend (`backend/.env`)

| Variable | Required in Staging/Prod | Default (Development) | Description |
|---|---|---|---|
| `ENVIRONMENT` | **Required** | `development` | Environment mode (`staging`, `stage`, `production`, `prod`, `development`) |
| `JWT_SECRET` | **Required** | `miracle-secret-key...` | Cryptographically random secret key (≥32 chars). Generate: `openssl rand -hex 32` |
| `DATABASE_URL` | **Required** | `sqlite:///./miracle.db` | PostgreSQL connection string: `postgresql://USER:PASSWORD@HOST:5432/DBNAME` |
| `CORS_ORIGINS` | **Required** | `http://localhost:5173...` | Comma-separated allowed frontend domains: `https://staging.miracleskincare.com` |
| `PASSWORD_HASHING_SCHEME` | Optional | `argon2id` | Password hashing algorithm |
| `AUTH_RATE_LIMIT_LOGIN` | Optional | `100/minute` | Rate limit for `/api/v1/auth/login` |
| `AUTH_RATE_LIMIT_REGISTER` | Optional | `50/minute` | Rate limit for `/api/v1/auth/register` |
| `DB_POOL_SIZE` | Optional | `5` | SQLAlchemy pool size for PostgreSQL |
| `DB_MAX_OVERFLOW` | Optional | `10` | SQLAlchemy max overflow connections for PostgreSQL |
| `DB_POOL_RECYCLE` | Optional | `1800` | Connection recycle interval in seconds |

### Frontend (`source/.env`)

| Variable | Required in Staging/Prod | Default (Development) | Description |
|---|---|---|---|
| `VITE_API_URL` | **Required** | `http://127.0.0.1:8000/api/v1` | Full backend API URL: `https://staging-api.miracleskincare.com/api/v1` |

---

## 4. Backend Deployment Steps

### Step 1: Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### Step 2: Configure Environment

Copy `.env.example` to `.env` or set server environment variables:

```bash
cp backend/.env.example backend/.env
```

### Step 3: Run Backend Process

#### Staging / Production Command (Uvicorn Multi-Worker)

```bash
# DO NOT use --reload flag in staging or production
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### Staging / Production Command (Gunicorn + Uvicorn Worker)

```bash
gunicorn backend.app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers 4 \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

---

## 5. Frontend Deployment Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build for Staging / Production

Inject `VITE_API_URL` at build time so Vite replaces local fallback strings with the staging/production API domain:

```bash
VITE_API_URL=https://staging-api.miracleskincare.com/api/v1 npm run build
```

### Step 3: Serve Static Dist Files

The static output directory `dist/` contains `index.html`, CSS, and JS assets.  
Serve using Nginx, Caddy, or static host.

#### Sample Nginx Configuration

```nginx
server {
    listen 80;
    server_name staging.miracleskincare.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.miracleskincare.com;

    ssl_certificate /etc/letsencrypt/live/staging.miracleskincare.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.miracleskincare.com/privkey.pem;

    root /var/www/miracle/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. PostgreSQL Database Setup

```sql
-- Create database and user on PostgreSQL server
CREATE DATABASE miracle_staging;
CREATE USER miracle_user WITH ENCRYPTED PASSWORD 'your_strong_staging_password';
GRANT ALL PRIVILEGES ON DATABASE miracle_staging TO miracle_user;
```

Connection string:
```
postgresql://miracle_user:your_strong_staging_password@localhost:5432/miracle_staging
```

SQLAlchemy automatically normalizes legacy `postgres://` URLs to `postgresql://`.

---

## 7. Health Probes & Monitoring

| Endpoint | Probe Type | Expected Output | Status Code |
|---|---|---|---|
| `GET /health` | Liveness | `{"status": "ok", "service": "miracle-api"}` | `HTTP 200` |
| `GET /ready` | Readiness | `{"status": "ready", "database": "connected"}` | `HTTP 200` (or `HTTP 503` if DB down) |

---

## 8. Security Checklist

- [ ] `ENVIRONMENT` is set to `staging` or `production`
- [ ] `JWT_SECRET` is set to a unique random value (≥32 chars)
- [ ] `DATABASE_URL` points to PostgreSQL (not SQLite)
- [ ] `CORS_ORIGINS` is restricted to specific frontend domain(s)
- [ ] `VITE_API_URL` is configured at frontend build time
- [ ] Demo user seeding is verified suppressed (`ENVIRONMENT=staging` / `production`)
- [ ] `--reload` flag is **NOT** used in the start command
- [ ] Reverse proxy handles SSL/TLS termination
- [ ] Secrets and `.env` files are excluded from Git repository (`.gitignore`)

---

## 9. Migration & Rollback Guidance

### Schema Updates
- Tables are created automatically on startup via `Base.metadata.create_all(bind=engine)` if absent.
- Schema changes in future releases should be executed via migration scripts prior to starting updated backend services.

### Rollback Strategy
1. **Frontend**: Re-deploy previous `dist/` bundle or point web server root to previous release directory.
2. **Backend**: Stop current process, checkout previous Git commit, restart Uvicorn/Gunicorn process.
3. **Database**: Restore PostgreSQL snapshot if schema alterations were executed.

---

## 10. Verification Suite

Run this full suite prior to promoting any commit to staging:

```bash
python -m pytest backend/tests/ -v --tb=short
python verify_security_hardening.py
python verify_rbac_403.py
python verify_full_e2e_journey.py
python verify_staging_readiness.py
npm run build
```
