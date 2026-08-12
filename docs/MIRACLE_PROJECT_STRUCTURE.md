# MIRACLE — Final Project Structure & Component Directory

---

## Top-Level Repository Layout

```
MIRACLE/
├── backend/                     # Python FastAPI backend application
│   ├── app/
│   │   ├── main.py              # FastAPI app factory, router registration, SPA static file mounting
│   │   ├── models.py            # SQLAlchemy ORM models (User, UserProfile, SkinAssessment, etc.)
│   │   ├── database.py          # DB session factory, routine log JSON read/write with error boundaries
│   │   ├── auth.py              # JWT creation, bcrypt verification, get_current_user dependency
│   │   ├── schemas.py           # Pydantic request/response schema definitions
│   │   ├── data/
│   │   │   ├── routine_logs.json        # JSON flat-file daily routine completion log store
│   │   │   ├── products_dataset.json    # Product dataset used for recommendation seeding
│   │   │   └── ingredients_data.json    # INCI chemical hazard reference dataset
│   │   └── routers/
│   │       ├── auth_router.py           # /api/v1/auth/* — register, login, profile
│   │       ├── assessment_router.py     # /api/v1/assessment/* — AI evaluate, score, profile
│   │       ├── routine_router.py        # /api/v1/routine — GET active routine, POST log
│   │       ├── recommendation_router.py # /api/v1/recommendations — skin-type filtered products
│   │       ├── ingredient_router.py     # /api/v1/ingredients/evaluate — INCI chemical analysis
│   │       ├── appointment_router.py    # /api/v1/appointments/* — request, status, refer
│   │       ├── consultant_router.py     # /api/v1/consultant/* — roster, prescribe
│   │       ├── analytics_router.py      # /api/v1/analytics/* — photos, progress tracking
│   │       └── admin_router.py          # /api/v1/admin/* — stats, user management
│   ├── tests/
│   │   ├── test_auth.py                 # Registration, login, invalid credentials, JWT
│   │   ├── test_assessment.py           # Score evaluation, subscore accuracy
│   │   ├── test_routine.py              # Routine retrieval, checklist logging
│   │   ├── test_recommendations.py      # Skin-type product filtering
│   │   ├── test_ingredients.py          # Chemical safety score evaluation
│   │   ├── test_appointments.py         # Booking, accept, reject, refer lifecycle
│   │   ├── test_consultant.py           # Roster, prescribe workflow
│   │   ├── test_admin.py                # Stats, user roster, RBAC guards
│   │   └── test_isolation.py            # Multi-user data isolation & RBAC tests
│   └── requirements.txt                 # Python dependencies
│
├── source/src/                          # Vite React TypeScript frontend source
│   └── app/
│       ├── pages/
│       │   ├── Landing.tsx              # Marketing landing page
│       │   ├── Login.tsx                # Login page with JWT token storage
│       │   ├── SignUp.tsx               # Registration page with role selection
│       │   └── Dashboard.tsx            # Role router — dispatches to correct Workspace
│       ├── components/
│       │   └── dashboard/
│       │       ├── UserWorkspace.tsx     # Complete User dashboard (14 sections)
│       │       ├── ConsultantWorkspace.tsx # Complete Consultant dashboard
│       │       ├── DermaWorkspace.tsx    # Complete Dermatologist dashboard
│       │       ├── AdminWorkspace.tsx    # Complete Administrator dashboard
│       │       ├── Sidebar.tsx          # Shared role-specific sidebar with navigation & footer CTAs
│       │       └── Topbar.tsx           # Shared topbar with live name, adherence %, search, profile menu
│       └── services/
│           └── api.ts                   # Typed API client — all backend API calls
│
├── docs/                                # Project documentation (added in delivery phase)
│   ├── MIRACLE_FINAL_PROJECT_DOCUMENTATION.md
│   ├── MIRACLE_LIVE_DEMO_SCRIPT.md
│   ├── MIRACLE_FINAL_PPT_CONTENT.md
│   ├── MIRACLE_SCREENSHOT_CHECKLIST.md
│   ├── MIRACLE_RESUME_DESCRIPTION.md
│   ├── MIRACLE_VIVA_QUESTIONS.md
│   ├── MIRACLE_PROJECT_STRUCTURE.md
│   └── diagrams/
│       ├── 01_system_architecture.md
│       ├── 02_four_milestone_flow.md
│       ├── 03_database_architecture.md
│       ├── 04_authentication_rbac.md
│       ├── 05_four_role_workflow.md
│       └── 06_user_to_dermatologist_lifecycle.md
│
├── dist/                                # Vite production build output (served by FastAPI)
│   ├── index.html
│   └── assets/
│       ├── index-*.js                   # Bundled SPA JavaScript (~728kB)
│       └── index-*.css                  # Bundled CSS styles (~41kB)
│
├── README.md                            # Professional GitHub README
├── vite.config.ts                       # Vite build configuration
├── tsconfig.json                        # TypeScript compiler config
└── package.json                         # Node.js project manifest
```

---

## Key Component Responsibilities

| File | Role |
|---|---|
| `backend/app/main.py` | FastAPI app entry point; registers all routers; serves SPA from `dist/`. |
| `backend/app/models.py` | Defines 7 SQLAlchemy ORM tables: `User`, `UserProfile`, `SkinAssessment`, `SkincareRoutine`, `ProgressPhoto`, `Appointment`, `Product`. |
| `backend/app/database.py` | SQLAlchemy session factory; JSON routine log reader/writer with JSONDecodeError auto-recovery. |
| `backend/app/auth.py` | JWT encode/decode with `python-jose`; bcrypt verify with `passlib`; `get_current_user` FastAPI dependency. |
| `backend/app/routers/consultant_router.py` | Consultant roster, `prescribe` endpoint (used by both Consultants and Dermatologists). |
| `source/src/app/pages/Dashboard.tsx` | Role-based router; reads `miracle_role` from localStorage and mounts the correct Workspace component. |
| `source/src/app/components/dashboard/Sidebar.tsx` | Dynamic sidebar items per role; footer action CTAs; active section highlighting. |
| `source/src/app/components/dashboard/Topbar.tsx` | Live name from DB; 7-day adherence metric; search navigation; profile dropdown menu. |
| `source/src/app/services/api.ts` | Centralized typed API client; includes `getRoutine`, `logRoutine`, `evaluate`, `prescribe`, `refer`, `getAdminStats`, etc. |
