# MIRACLE — Viva / Project Defense Q&A Guide (50 Questions)

Based strictly on the actual implementation.

---

## Project Overview

**Q1. What is MIRACLE?**
> MIRACLE is a full-stack AI skincare intelligence and clinical tele-dermatology platform. It combines deterministic skin health assessment scoring, personalized routine generation, chemical ingredient safety analysis, and a multi-role clinical referral pipeline across Users, Skincare Consultants, Dermatologists, and Administrators.

**Q2. What problem does MIRACLE solve?**
> Three core problems: lack of skin-type personalized routines, opaque chemical ingredient safety risks (INCI labels), and fragmentation between consumer skincare and certified clinical dermatologists.

**Q3. What are the four milestones of MIRACLE?**
> Milestone 1: AI Skin Assessment & Scoring. Milestone 2: Personalized Routine & Daily Checklist. Milestone 3: Product Recommendations & Ingredient Safety Analyzer. Milestone 4: Tele-Dermatology & Clinical Referral Lifecycle.

**Q4. Is MIRACLE deployed and live?**
> Yes. MIRACLE is deployed live on Railway PaaS at `https://miracle-production-e7d3.up.railway.app`.

---

## Why These Technologies?

**Q5. Why did you choose React 18 for the frontend?**
> React 18's component model allows building isolated, reusable dashboard workspaces per role. Its hooks-based state management pattern keeps component logic clean without requiring a large external state library for this scope.

**Q6. Why TypeScript instead of plain JavaScript?**
> TypeScript provides compile-time type safety, catches null-reference errors early, and ensures that API response shapes match the component expectations before reaching production.

**Q7. Why Vite instead of Create React App?**
> Vite provides significantly faster development builds (HMR in under 300ms) and optimized production Rollup bundling without the config overhead of Webpack-based CRA setups.

**Q8. Why FastAPI instead of Flask or Django?**
> FastAPI provides native async support, automatic OpenAPI/Swagger documentation generation, Pydantic request/response validation, and significantly higher throughput than synchronous Flask. It is the modern Python API standard.

**Q9. Why PostgreSQL instead of SQLite or MongoDB?**
> MIRACLE's relational data model — users, assessments, routines, appointments, progress photos — is structurally relational with foreign key constraints enforcing referential integrity. PostgreSQL is production-grade with Railway managed hosting.

**Q10. Why use Vanilla CSS instead of Tailwind or Bootstrap?**
> Vanilla CSS gives full design flexibility over the custom glassmorphic design system, HSL color palettes, custom animations, and micro-interactions without utility class constraints.

---

## Authentication & JWT

**Q11. How does authentication work in MIRACLE?**
> Users submit credentials to `POST /api/v1/auth/login`. The backend verifies the bcrypt-hashed password and returns a signed JWT access token containing the user's ID, email, and role.

**Q12. How is the JWT token stored on the frontend?**
> The JWT is stored in `localStorage` under the `miracle_token` key. All subsequent API requests include `Authorization: Bearer {token}` headers.

**Q13. Why localStorage and not HttpOnly cookies for JWT?**
> For this educational SPA architecture, localStorage provides straightforward token management. In a production healthcare deployment, HttpOnly secure cookies would be preferable to mitigate XSS risks.

**Q14. How does the backend validate the JWT?**
> Using `python-jose` and a shared `SECRET_KEY`. The `get_current_user()` FastAPI dependency is injected into protected route handlers. If the token is expired, malformed, or absent, the endpoint returns `401 Unauthorized`.

**Q15. How does logout work?**
> Logout clears the `miracle_token` and `miracle_role` keys from `localStorage` and redirects to the `/login` page. There is no server-side token blocklist; tokens expire naturally via JWT expiry.

---

## Role-Based Access Control (RBAC)

**Q16. How is RBAC enforced in MIRACLE?**
> RBAC is enforced at the FastAPI route dependency level. Each protected route calls `require_role(["Administrator"])` or `require_role(["Skincare Consultant", "Dermatologist"])`. If the authenticated user's role doesn't match, a `403 Forbidden` is returned.

**Q17. Can a normal User access Consultant or Admin endpoints?**
> No. Any attempt by a User role to call `/api/v1/admin/stats` or `/api/v1/consultant/roster` returns `403 Forbidden`.

**Q18. Can a Consultant see another Consultant's patients?**
> No. The consultant roster query filters appointments by `consultant_id == current_user.id`, ensuring consultants only see their own assigned patients.

---

## Database Design

**Q19. What database tables does MIRACLE use?**
> `users`, `user_profiles`, `skin_assessments`, `skincare_routines`, `progress_photos`, `appointments`, `products`.

**Q20. How is multi-user data isolation enforced at the database level?**
> Every query filtering user-specific data (assessments, routines, appointments, photos) includes a `WHERE user_id = :current_user_id` clause via SQLAlchemy ORM, preventing cross-user data access.

**Q21. How are foreign key constraints used?**
> `user_profiles.user_id`, `skin_assessments.user_id`, `skincare_routines.user_id`, `appointments.user_id`, and `progress_photos.user_id` all reference `users.id` with `CASCADE` delete behavior.

**Q22. How are routine logs stored?**
> Daily routine completion logs (task arrays, water intake in mL, sleep hours) are stored in a JSON log file (`backend/app/data/routine_logs.json`) with `try/except JSONDecodeError` error boundaries to prevent crash-on-corrupt-file.

---

## AI / Scoring Engine

**Q23. How does the AI Skin Assessment scoring engine work?**
> The `POST /api/v1/assessment/evaluate` endpoint receives structured questionnaire inputs (acne severity 1–5, hyperpigmentation severity 1–5, redness, wrinkles, skin type, allergies). A deterministic weighted formula produces an overall score (0–100) and individual subscores for hydration, consistency, sleep, and barrier repair.

**Q24. Is it a machine learning model or a rule-based engine?**
> It is a deterministic rule-based scoring engine. No ML model training is required; the scoring weights are domain-calibrated to dermatological severity inputs.

**Q25. How is the assessment score persisted?**
> The `SkinAssessment` ORM model inserts a record in the PostgreSQL `skin_assessments` table linked to the user's ID, enabling trajectory tracking across multiple assessments.

---

## Product Recommendations & Ingredient Analyzer

**Q26. How does the product recommendation engine work?**
> `GET /api/v1/recommendations?skin_type={type}` queries the PostgreSQL `products` table filtering by `skin_type` compatibility, returning a ranked list of products.

**Q27. How does the INCI Ingredient Analyzer work?**
> `POST /api/v1/ingredients/evaluate` receives a list of raw ingredient names, the user's allergy list, and routine timing (AM/PM). The analyzer cross-references each ingredient against known hazard classifications, allergen lists, and AM/PM suitability rules, returning a composite safety score and flagged concerns.

**Q28. What is INCI?**
> INCI stands for International Nomenclature of Cosmetic Ingredients — the standardized naming system for cosmetic chemical compounds.

---

## Routine & Adherence Tracking

**Q29. How is routine adherence calculated?**
> On the frontend, `api.getRoutineLogs()` retrieves the last 7 days of log entries. Adherence is calculated as the percentage of days where at least one routine task was completed: `(days_logged / 7) × 100`.

**Q30. How are routine steps generated?**
> Based on the user's skin assessment and profile, the `GET /api/v1/routine` endpoint retrieves `SkincareRoutine` records for that user, ordered by `time_of_day` (AM/PM) and `step_number`.

---

## Appointment & Clinical Referral Workflow

**Q31. Walk through the complete appointment lifecycle.**
> 1. User: `POST /api/v1/appointments/request` (status: `Pending`). 2. Consultant: `POST /api/v1/appointments/{id}/status` (status: `Accepted`). 3. Consultant: `POST /api/v1/consultant/prescribe` (routine steps saved). 4. Consultant: `POST /api/v1/appointments/{id}/refer` (status: `Referred_To_Dermatologist`). 5. Dermatologist: `POST /api/v1/consultant/prescribe` (Adapalene 0.1% Gel). 6. User: `GET /api/v1/routine` shows updated treatment.

**Q32. How does the Dermatologist know which patients are referred?**
> The Dermatologist dashboard calls `GET /api/v1/appointments/my`, which returns appointments with `status == "Referred_To_Dermatologist"` that target the dermatologist role.

**Q33. How does the Dermatologist prescription reach the User?**
> The `POST /api/v1/consultant/prescribe` endpoint, when called by a Dermatologist, inserts routine steps with `prescribed_by_doctor: true` for the target `patient_id`. When the User next calls `GET /api/v1/routine`, these steps appear in their routine.

---

## Testing

**Q34. How many tests does MIRACLE have?**
> 208 Pytest backend tests covering authentication, assessment, routine, recommendations, ingredients, appointments, consultant prescriptions, referrals, admin stats, data isolation, and RBAC security.

**Q35. What testing framework was used?**
> Pytest with FastAPI's `TestClient` (backed by `httpx`) for in-process API testing without needing a running server.

**Q36. How was multi-user isolation tested?**
> The test suite registers two separate users (User A and User B), creates appointments as User A, then verifies that the same appointment is not visible in User B's appointment list, and that User B cannot access admin stats (returns 403).

**Q37. What does `npx tsc --noEmit` verify?**
> It runs the TypeScript compiler in type-check-only mode (no output files generated), verifying that all component props, API response types, and state shapes are correctly typed. Result: 0 errors.

---

## Security

**Q38. How is the password stored?**
> Using bcrypt hashing via `passlib`. Plaintext passwords are never stored; only the bcrypt hash digest is written to the database.

**Q39. What happens if an invalid JWT token is provided?**
> The `get_current_user` FastAPI dependency raises an `HTTPException` with `status_code=401` and `detail="Could not validate credentials"`.

**Q40. How is the Role Switcher removed?**
> The `RoleSwitcher.tsx` component was deleted from the codebase. Users are locked to their authenticated role and cannot switch roles from the UI; only re-registering or logging in with a different role account can change the role.

---

## Deployment

**Q41. How is MIRACLE deployed to production?**
> The GitHub repository `main` branch is connected to Railway PaaS. Each `git push origin main` triggers a Railway build pipeline that installs Python dependencies, builds the Vite production SPA into `dist/`, and starts the FastAPI server that serves both the API and the SPA from the same Uvicorn process.

**Q42. How does the backend serve the React SPA?**
> FastAPI's `app/main.py` detects the `dist/` directory produced by `npm run build` and mounts a `StaticFiles` handler. The React Router client-side routes are handled by a catch-all `index.html` fallback route.

**Q43. What are the live production health endpoints?**
> `GET /health` returns `{"status": "ok", "service": "miracle-api"}`. `GET /ready` returns `{"status": "ready", "database": "connected"}`.

---

## Challenges & Future

**Q44. What was the most challenging bug you fixed?**
> The most critical production bug was a `JSONDecodeError` crash in `get_routine_logs()` when `routine_logs.json` was empty or corrupted on Railway's ephemeral filesystem. Fixed by wrapping the file read in `try/except (json.JSONDecodeError, ValueError)` with automatic file re-initialization to `[]`.

**Q45. What challenges did you face with multi-role data isolation?**
> Ensuring that every SQLAlchemy query included the `current_user.id` filter required auditing each router independently. The Consultant roster query was particularly complex because it joins across `users`, `user_profiles`, `skin_assessments`, and `appointments` tables.

**Q46. What would you improve in MIRACLE with more time?**
> Computer vision CNN model for selfie-based skin lesion detection, React Native mobile apps, automated pharmacy prescription fulfillment API integration, and HttpOnly secure cookie authentication.

**Q47. Why did you choose Railway over AWS or Heroku?**
> Railway offers zero-configuration PostgreSQL managed databases, automatic HTTPS, free tier for demonstration projects, and a GitHub-integrated build pipeline without the overhead of AWS IAM/ECS configuration.

**Q48. How does MIRACLE handle very large user numbers?**
> The admin stats endpoint demonstrated 10,000+ users in the test database. PostgreSQL indexing on `user_id` foreign keys ensures sub-second query times. For scale, connection pooling via SQLAlchemy's `pool_size` settings would be configured.

**Q49. What is the routine_logs.json file and why is it used instead of a DB table?**
> `routine_logs.json` stores daily routine completion records as a lightweight flat-file log store. It avoids an additional high-write-frequency table for habit tracking. Error boundaries prevent crashes if the file is corrupted or empty.

**Q50. How does the platform confirm a user's identity after login?**
> After login, the JWT is decoded client-side to extract `name` and `role`. Additionally, `GET /api/v1/assessment/profile` is called on dashboard load to sync the latest DB-persisted display name into the topbar greeting, ensuring stale cached names never appear.
