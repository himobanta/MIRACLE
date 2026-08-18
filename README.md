

# MIRACLE — AI Skincare Intelligence & Personalized Skincare Planner

> **Enterprise AI Skincare Intelligence, Chemical Ingredient Analysis & Clinical Tele-Dermatology Platform**

[![Build & Verification Status](https://img.shields.io/badge/Release_Status-READY-brightgreen.svg)](https://miracle-production-e7d3.up.railway.app)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Railway](https://img.shields.io/badge/Deployment-Railway-0B0D0E.svg?logo=railway&logoColor=white)](https://miracle-production-e7d3.up.railway.app)

---

## 🌟 Overview

**MIRACLE** is an enterprise-ready, multi-role AI skincare intelligence platform. It bridges the gap between everyday consumer skincare routines, chemical active safety analysis, and certified clinical dermatology care.

Deployed live on Railway: **[https://miracle-production-e7d3.up.railway.app](https://miracle-production-e7d3.up.railway.app)**

---

## 🎯 Key Features Across Four Milestones

### 🧠 Milestone 1: AI Skin Health Assessment & Scoring
- Questionnaire-driven deterministic skin scoring engine (0–100) evaluating acne, hyperpigmentation, redness, and wrinkles.
- Subscore breakdown across **Hydration**, **Consistency**, **Sleep**, and **Barrier Repair**.
- Trajectory tracking across past assessments stored in PostgreSQL.

### 📋 Milestone 2: Dynamic Routine Generator & Daily Checklist
- Auto-generates personalized Morning (AM), Evening (PM), and Weekly Night routine steps.
- Interactive daily checklist habit tracker logging water intake (L) and sleep hours.
- Live 7-day adherence metric calculated from routine completion history.

### 🧪 Milestone 3: Recommendations & INCI Chemical Ingredient Analyzer
- Dataset-verified skincare product recommendations matched by user skin type.
- INCI chemical safety analyzer checking active cross-reactivity, allergen risks, and AM/PM routine suitability.

### 🩺 Milestone 4: Tele-Dermatology & Clinical Referral Lifecycle
- **User**: Requests consultation date & time.
- **Consultant**: Reviews client assessment trajectory, accepts consultation, prescribes custom routine, and refers complex cases.
- **Dermatologist**: Receives referral in clinical queue, reviews medical history, and prescribes high-potency clinical active (**Adapalene 0.1% Gel**).
- **User Routine Sync**: Prescribed clinical treatments update reactively in the User's active routine upon login.

---

## 👥 Four Role-Specific Workspaces

1. **User Dashboard**: Skin health scoring, personalized routine tracking, daily checklist, product safety lookup, photo progress gallery, consultation booking.
2. **Skincare Consultant Dashboard**: Assigned client roster, patient search/filter, clinical profile inspection, routine prescription engine, dermatologist referral.
3. **Dermatologist Dashboard**: Clinical referral queue, medical profile review, clinical active prescription engine (**Adapalene 0.1% Gel**).
4. **Administrator Dashboard**: Real-time DB platform metrics, user roster management, role filtering, live system audit feed, API/DB readiness health checks.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 SPA, TypeScript, Vite, Vanilla CSS Design System, React Router DOM |
| **Backend** | Python FastAPI, SQLAlchemy ORM, Pydantic, Uvicorn |
| **Database & Logs** | PostgreSQL, Structured JSON Routine Log Engine (`routine_logs.json`) |
| **Auth & Security** | OAuth2 JWT Bearer Tokens, Bcrypt password hashing (`passlib`), Server-side RBAC |
| **Deployment** | Railway PaaS (`miracle-production-e7d3.up.railway.app`), GitHub (`main` branch) |

---

## 🚀 Local Quickstart Guide

### Prerequisites
- **Node.js** v18+ and **npm**
- **Python** v3.11+
- **PostgreSQL** database instance (or SQLite fallback)

### 1. Repository Setup
```bash
git clone https://github.com/himobanta/MIRACLE.git
cd MIRACLE
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI Server
uvicorn backend.app.main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000` (Docs: `http://localhost:8000/docs`).

### 3. Frontend Setup
```bash
# Install Node modules
npm install

# Run Vite dev server
npm run dev
```
Frontend React SPA will be running at `http://localhost:5173`.

---

## 🧪 Testing & Quality Assurance

### Run Backend Pytest Suite (208 Tests)
```bash
python -m pytest backend/tests/ -q --tb=short
```

### Run TypeScript Type Check
```bash
npx tsc --noEmit
```

### Run Production Build
```bash
npm run build
```

---

## 🔒 Security & Data Isolation
- **Role-Based Access Control**: Route guards enforce JWT token role authorization (`User`, `Skincare Consultant`, `Dermatologist`, `Administrator`). Non-admin attempts to access `/api/v1/admin/*` return `403 Forbidden`.
- **Multi-User Isolation**: Database queries for profiles, assessments, routines, appointments, and progress photos filter strictly by authenticated `user_id`.

---

## 📄 License & Attribution
Developed for educational and clinical tele-dermatology demonstration purposes. All rights reserved.


- APP SCREEN RECORDING: https://drive.google.com/drive/folders/1ZSBVa_EldARQA9b0DLK-mYxka784CWAm?usp=sharing
