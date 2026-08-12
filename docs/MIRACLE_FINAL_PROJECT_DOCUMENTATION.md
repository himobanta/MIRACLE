# MIRACLE — AI Skincare Intelligence & Personalized Skincare Planner
## Final Comprehensive Project Documentation

---

## 1. Project Title
**MIRACLE: AI Skincare Intelligence & Personalized Skincare Planner**

---

## 2. Project Overview
MIRACLE is a full-stack, enterprise-grade AI skincare intelligence and clinical tele-dermatology platform. It combines artificial intelligence skin health assessment, dynamic routine generation, product safety recommendation engines, active chemical ingredient cross-reactivity analysis, and a complete multi-role clinical tele-dermatology ecosystem (**User**, **Skincare Consultant**, **Dermatologist**, **Administrator**).

---

## 3. Problem Statement
Modern consumers face widespread challenges in personalized skincare management:
- **Lack of Personalization**: Generic skincare routines fail to account for individual skin types, environmental exposure, lifestyle factors, and specific dermatological concerns.
- **Ingredient Confusion**: Chemical active lists (INCI) are opaque, making it difficult for users to evaluate safety, allergen risks, or contraindications (e.g., combining Retinoids with AHA/BHAs).
- **Clinical Fragmentation**: Disconnect between consumer product usage, skincare consultants, and clinical dermatologists leads to delayed interventions and unmonitored treatment compliance.

---

## 4. Motivation
MIRACLE bridges the gap between everyday consumer skincare routines and professional clinical care. By delivering instant, data-driven AI skin health assessments and seamlessly connecting users with certified skincare consultants and clinical dermatologists, MIRACLE democratizes evidence-based skin health.

---

## 5. Project Objectives
1. **AI Skin Assessment & Scoring**: Provide automated questionnaire-driven skin health scoring (0–100) and subscore analysis (Hydration, Consistency, Sleep, Barrier).
2. **Personalized Routine & Checklist**: Auto-generate custom morning (AM), evening (PM), and weekly routines, coupled with interactive daily checklist habit tracking and adherence metrics.
3. **Product & Ingredient Safety Engine**: Recommend dataset-verified products matched by skin type and provide INCI chemical safety analysis for user allergies and active cross-reactivity.
4. **Tele-Dermatology & Clinical Referral Lifecycle**: Facilitate end-to-end clinical care where Users book consultations, Consultants review assessment history and prescribe routines, Consultants refer complex cases to Dermatologists, and Dermatologists prescribe high-potency clinical actives (**Adapalene 0.1% Gel**), updating the user's active routine.
5. **Role-Based Security & Isolation**: Enforce strict server-side Role-Based Access Control (RBAC) and multi-user data isolation across all API endpoints and database storage.

---

## 6. Proposed Solution
MIRACLE delivers a unified React 18 SPA web application backed by a high-performance Python FastAPI REST API and PostgreSQL database architecture. The system features a responsive, glassmorphic design system operating across four role-specific dashboard workspaces.

---

## 7. Key Features
- **Deterministic AI Skin Health Assessment**: Calculates overall health score, subscores, and primary concerns.
- **Dynamic Morning/Evening/Weekly Routine Generator**: Tailored step-by-step skincare steps.
- **Daily Checklist & Adherence Tracker**: Logs water intake (L), sleep hours, and routine task completions.
- **Dataset-Verified Product Recommendations**: Sourced directly from PostgreSQL database.
- **INCI Chemical Ingredient Analyzer**: Chemical hazard evaluation, allergen warnings, and routine time recommendations (AM vs. PM).
- **Progress Photo Trajectory**: Progress photo gallery with tag filtering and health score alignment.
- **Complete Clinical Tele-Dermatology Workflow**: User booking $\rightarrow$ Consultant review & routine prescription $\rightarrow$ Dermatologist referral $\rightarrow$ Clinical active prescription $\rightarrow$ User routine sync.
- **System Administrator Workspace**: Platform statistics (total users, assessments, appointments), user roster management, live system activity audit logs, and API/DB health readiness monitors.

---

## 8. Four-Milestone Architecture

```
[Milestone 1: AI Skin Assessment] ──► [Milestone 2: Personalized Routine & Checklist]
                                                    │
                                                    ▼
[Milestone 4: Clinical Referral Lifecycle] ◄── [Milestone 3: Recommendations & INCI Analyzer]
```

### Milestone 1: AI Skin Assessment & Scoring System
- **Frontend**: `skin-assessment`, `my-skin-profile`
- **Backend API**: `POST /api/v1/assessment/evaluate`, `GET /api/v1/assessment/score`
- **Database**: `SkinAssessment`, `UserProfile`
- **Logic**: Evaluates skin type, acne severity, hyperpigmentation, redness, wrinkles, and lifestyle inputs to generate a score (0–100).

### Milestone 2: Personalized Skincare Routine & Daily Checklist
- **Frontend**: `my-routine`, `daily-checklist`, `lifestyle-&-habits`
- **Backend API**: `GET /api/v1/routine`, `POST /api/v1/routine/log`
- **Database / Storage**: `SkincareRoutine`, `routine_logs.json`
- **Logic**: Generates AM/PM routine steps; logs task completion array, water intake (mL), and sleep hours; updates 7-day adherence %.

### Milestone 3: Product Recommendations & INCI Ingredient Analyzer
- **Frontend**: `product-recommendations`, `ingredient-analyzer`
- **Backend API**: `GET /api/v1/recommendations`, `POST /api/v1/ingredients/evaluate`
- **Database**: `Product` dataset, INCI Safety Analysis Engine
- **Logic**: Sources compatible products from PostgreSQL dataset based on skin type; analyzes raw ingredient strings for chemical hazard scores and allergen risks.

### Milestone 4: Tele-Dermatology & Clinical Referral Lifecycle
- **Frontend**: `appointments`, `clients`, `consultations`
- **Backend API**: `POST /api/v1/appointments/request`, `POST /api/v1/consultant/prescribe`, `POST /api/v1/appointments/{id}/refer`
- **Database**: `Appointment`, `SkincareRoutine`
- **Logic**: User requests consultation $\rightarrow$ Consultant accepts, reviews assessment trajectory, prescribes custom routine, and refers to Dermatologist $\rightarrow$ Dermatologist prescribes clinical active **Adapalene 0.1% Gel** $\rightarrow$ User routine syncs reactively.

---

## 9. Four Dashboard Roles

| Role | Primary Dashboard View | Core Workflows Implemented |
|---|---|---|
| **User** | `UserWorkspace.tsx` | Profile editing, AI assessment, routine tracker, daily checklist, product cards, ingredient analyzer, photo gallery, appointment booking, lifestyle metrics. |
| **Consultant** | `ConsultantWorkspace.tsx` | Client roster management, search/filtering, client clinical file inspection, appointment acceptance/rejection, custom routine prescription, dermatologist referral. |
| **Dermatologist**| `DermaWorkspace.tsx` | Referral queue, patient file inspection, medical status updates, high-potency clinical active prescription (**Adapalene 0.1% Gel**). |
| **Administrator**| `AdminWorkspace.tsx` | Platform statistics, user roster management, role filtering, audit activity feed, live API/DB system health readiness monitors. |

---

## 10. System & Technical Architecture

### Frontend Technology Stack
- **Framework**: React 18 SPA built with TypeScript & Vite
- **Styling**: Vanilla CSS Design System with custom HSL color tokens, glassmorphism, dynamic micro-animations, and responsive container layouts
- **Routing**: React Router DOM (`/dashboard/user`, `/dashboard/consultant`, `/dashboard/derma`, `/dashboard/admin`)
- **State & Storage**: Component-level React state hooks + `localStorage` JWT token session management

### Backend Technology Stack
- **Framework**: Python FastAPI (`app/main.py`)
- **Database Layer**: PostgreSQL managed via SQLAlchemy ORM (`app/models.py`)
- **File / Log Storage**: JSON log storage (`backend/app/data/routine_logs.json`) with robust parsing boundaries
- **Authentication**: OAuth2 Password Flow with JWT Bearer Token validation and `passlib` bcrypt password hashing

---

## 11. Security, Authorization & Data Isolation
- **Role-Based Access Control (RBAC)**: All protected routes enforce JWT token inspection. Attempts by normal users or consultants to access `/api/v1/admin/*` return `403 Forbidden`.
- **Multi-User Data Isolation**: Queries for user profiles, skin assessments, routines, appointments, and progress photos filter strictly by `current_user.id`. User A cannot view User B's data.

---

## 12. Deployment & Verification
- **Production Hosting**: Railway (`https://miracle-production-e7d3.up.railway.app`)
- **Version Control**: GitHub (`https://github.com/himobanta/MIRACLE.git`)
- **Automated Tests**: 208/208 Pytest backend tests passed, 0 TypeScript errors (`npx tsc --noEmit`), Vite production build passed.

---

## 13. Future Scope & Conclusion
Future enhancements include mobile application builds (React Native), integration of computer vision CNN models for automated selfie image segmentation, and automated pharmacy prescription fulfillment integration. MIRACLE stands as a fully operational, enterprise-ready skincare intelligence platform.
