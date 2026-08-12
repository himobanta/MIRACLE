# MIRACLE — Live Demonstration Script & Presenter Guide (7–10 Minutes)

## Overview
This guide provides a step-by-step presentation script for demonstrating the MIRACLE platform live to evaluators, professors, or clients.

---

## ⏱️ Timeline & Script Breakdown

### 00:00 – 00:45 | Introduction & Problem Statement
- **WHAT TO CLICK**: Open landing page `https://miracle-production-e7d3.up.railway.app`.
- **WHAT TO SAY**:
  > "Welcome to MIRACLE — an AI-powered skincare intelligence and clinical tele-dermatology platform. Consumers face two major issues in skincare: a lack of personalization and confusing chemical active ingredients. MIRACLE solves this by combining deterministic AI skin health scoring, dynamic routine generation, active chemical safety analysis, and a complete multi-role clinical tele-dermatology workflow connecting Users, Skincare Consultants, and Dermatologists."
- **WHAT THE EXAMINER SEES**: Clean, premium landing page hero section.

---

### 00:45 – 02:30 | User Registration & AI Skin Health Assessment (Milestone 1)
- **WHAT TO CLICK**: Click **Get Started**, register a fresh user (`demo_user@test.com`), open **User Dashboard**, and click **Take Photo Assessment**. Select skin parameters (Combination skin, Acne severity 3) and submit.
- **WHAT TO SAY**:
  > "First, we register as a new User. On our dashboard, we complete the AI Skin Assessment. The assessment engine evaluates skin parameters, lifestyle metrics (water, sleep), and allergen sensitivities to calculate an overall skin health score out of 100 alongside key subscores (Hydration, Consistency, Sleep, Barrier Repair). Notice that this score immediately saves to PostgreSQL."
- **WHAT THE EXAMINER SEES**: Calculated Overall Score (e.g. 94.9/100), hydration subscore ring, and primary detected skin concerns.

---

### 02:30 – 04:00 | Dynamic Routine Generator & Daily Checklist (Milestone 2)
- **WHAT TO CLICK**: Scroll to **Today's Routine** card and the **Daily Checklist** section. Toggle completed checkboxes.
- **WHAT TO SAY**:
  > "Based on our AI assessment score, MIRACLE auto-generates a personalized skincare routine divided into Morning (AM), Evening (PM), and Weekly treatments. As the user completes tasks and logs water intake or sleep, checking off items updates the daily compliance percentage and writes directly to log storage, calculating our live 7-day routine adherence metric."
- **WHAT THE EXAMINER SEES**: AM/PM routine steps, checklist progress bar animating to 100%, and topbar adherence metric updating live.

---

### 04:00 – 05:15 | Product Recommendations & INCI Chemical Analyzer (Milestone 3)
- **WHAT TO CLICK**: Scroll to **Recommended Products**, click a product card to open the detail modal, then navigate to **Ingredient Analyzer**. Input `Niacinamide, Salicylic Acid, Glycerin` and click **Check Ingredients**.
- **WHAT TO SAY**:
  > "MIRACLE sources dataset-verified skincare products matched specifically to the user's skin type. Furthermore, our INCI Chemical Ingredient Analyzer accepts raw chemical ingredient lists, checking against user allergies and routine timing (AM vs. PM) to generate a chemical safety score and allergen risk warning."
- **WHAT THE EXAMINER SEES**: Product modal with safety score (e.g. 94/100) and Verified source link; Ingredient Analyzer returning safety rating.

---

### 05:15 – 07:30 | Clinical Consultation & Referral Lifecycle (Milestone 4)
- **WHAT TO CLICK**:
  1. As **User**: Click **Book Consultation**, select Consultant, submit request.
  2. Logout and login as **Skincare Consultant** (`consultant@miracle.com`). Open **Patient Roster**, accept appointment, open clinical file, prescribe custom routine, and click **Refer to Dermatologist**.
  3. Logout and login as **Dermatologist** (`derma@miracle.com`). Open **Referral Queue**, inspect patient file, and submit clinical prescription for **Adapalene 0.1% Gel (Prescription)**.
- **WHAT TO SAY**:
  > "Now we demonstrate our multi-role clinical tele-dermatology workflow. The user requests a consultation. Logging in as a certified Skincare Consultant, we inspect the client's AI assessment history, accept the appointment, prescribe a tailored routine, and refer severe cases to a Dermatologist. Logging in as the Dermatologist, we receive the referral in our queue, inspect the clinical history, and prescribe a high-potency medical active: Adapalene 0.1% Gel."
- **WHAT THE EXAMINER SEES**: Roster table, patient profile history modal, consultant prescription form, dermatologist referral queue, and medical Rx form.

---

### 07:30 – 08:30 | User Live Routine Sync Verification
- **WHAT TO CLICK**: Logout as Dermatologist and login back as the **User**. Open **My Routine**.
- **WHAT TO SAY**:
  > "Logging back in as the User, we see that the Dermatologist-prescribed Adapalene 0.1% Gel has reactively synchronized directly into the user's active evening treatment routine."
- **WHAT THE EXAMINER SEES**: Active PM routine displaying **Adapalene 0.1% Gel (Prescription)**.

---

### 08:30 – 09:30 | Security, RBAC & Administrator Workspace
- **WHAT TO CLICK**: Logout and login as **Administrator** (`admin@miracle.com`). Showcase Platform Stats, User Management roster, and Live System Health.
- **WHAT TO SAY**:
  > "Finally, we log in as the Administrator. The Admin workspace displays real-time aggregate database metrics — over 10,000 registered users, live user search/filtering, audit activity logs, and real-time database readiness monitors. Server-side RBAC ensures normal users cannot access admin endpoints, returning 403 Forbidden."
- **WHAT THE EXAMINER SEES**: Real DB user count metrics, user management roster, live health indicators (`{"database": "connected"}`).

---

### 09:30 – 10:00 | Architecture Summary & Conclusion
- **WHAT TO SAY**:
  > "To summarize: MIRACLE is built with React 18, TypeScript, FastAPI, PostgreSQL, and deployed live on Railway with 208 passing backend tests and 0 static type errors. Thank you! We are open to questions."
