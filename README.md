# MIRACLE — AI Skincare Intelligence & Planner Platform

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF.svg)](https://vitejs.dev)

MIRACLE is a full-stack, AI-powered skincare intelligence platform that delivers personalized skin assessment, multi-subscore health evaluation, customized skincare routine generation, ingredient safety scoring, product recommendations, progress tracking, and multi-role clinical doctor/consultant portals.

---

## 🌟 Live Production Deployment

- **Live Backend API**: [https://miracle-production-e7d3.up.railway.app](https://miracle-production-e7d3.up.railway.app)
- **API Base URL**: `https://miracle-production-e7d3.up.railway.app/api/v1`
- **Interactive Swagger Docs**: [https://miracle-production-e7d3.up.railway.app/docs](https://miracle-production-e7d3.up.railway.app/docs)
- **Production Status**:
  - `GET /health` → `{"status":"ok","service":"miracle-api"}` (HTTP 200)
  - `GET /ready` → `{"status":"ready","database":"connected"}` (HTTP 200)

---

## 🏗️ System Architecture

```
   ┌─────────────────────────────────────────────────────────────────┐
   │                    React 18 SPA (Vite 6)                        │
   │  Landing • Auth • User Workspace • Consultant • Derma • Admin   │
   └────────────────────────────────┬────────────────────────────────┘
                                    │ HTTP / JSON (Bearer JWT)
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                       FastAPI Backend Engine                    │
   │    Auth • Assessment • Routine • Ingredients • Recommendations   │
   │    Analytics • Appointments • Consultant Portal • Admin Portal   │
   └───────┬────────────────────────┬────────────────────────┬───────┘
           │                        │                        │
           ▼                        ▼                        ▼
  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
  │ PostgreSQL (Prod)│    │ Algorithm Engine │    │  SkinSAFE Dataset│
  │ SQLite (Local)   │    │ Scoring/Routine  │    │  50,000+ Products│
  └──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 🔐 Role-Based Access Control (RBAC)

MIRACLE enforces strict role isolation across 4 distinct roles:

1. **User**: Public self-registration allowed. Access to personal profile, assessment, routine, progress logging, product recommendations, ingredient analysis, progress photo gallery, and appointment requests.
2. **Skincare Consultant**: Medical role. Access to patient roster, detailed patient inspection, dermatologist referrals, and appointment management.
3. **Dermatologist**: Medical role. Access to referred patients, full clinical history, appointment management, and doctor-prescribed routine overwrites with clinical notes.
4. **Administrator**: Platform management role. Access to real-time database statistics, user management, and platform activity feeds. Never exposes password hashes or internal secrets.

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Python**: 3.10+
- **Node.js**: 18+ & `npm` 9+

### 1. Backend Setup

```bash
# Install backend dependencies
pip install -r backend/requirements.txt

# Start local FastAPI backend (runs on http://127.0.0.1:8000)
python -m uvicorn backend.app.main:app --reload
```

### 2. Frontend Setup

```bash
# Install frontend dependencies
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev
```

---

## 🧪 Testing & Quality Assurance

### Run Backend Pytest Suite (208 / 208 Passed)

```bash
python -m pytest backend/tests/ -v --tb=short
```

### Run Staging Readiness Suite (7 / 7 Passed)

```bash
python verify_staging_readiness.py
```

### Run TypeScript Validation (0 Errors)

```bash
npx tsc --noEmit
```

### Production Build Verification

```bash
npm run build
```

---

## 📖 Deployment Guide

For complete staging and production deployment runbooks, see [`DEPLOYMENT.md`](file:///C:/Users/Himobanta%20dutta/Downloads/Miracle%20project/DEPLOYMENT.md).

---

## 📄 License

Proprietary — All rights reserved.
