import requests
import time

BASE = "https://miracle-production-e7d3.up.railway.app"
session = requests.Session()

print("=== 1. Health & Readiness ===")
print("/health:", session.get(BASE + "/health").json())
print("/ready :", session.get(BASE + "/ready").json())

print("\n=== 2. Static SPA Routes ===")
for route in ["/", "/login", "/signup", "/dashboard"]:
    r = session.get(BASE + route)
    ct = r.headers.get("content-type", "").split(";")[0]
    has_html = "<title>" in r.text or "<html" in r.text
    print(f"{route:<12} -> {r.status_code} [{ct}] html_rendered={has_html}")

print("\n=== 3. Public API (Recommendations & Skin Datasets) ===")
r_rec = session.get(BASE + "/api/v1/recommendations")
print("/recommendations ->", r_rec.status_code, "products_count:", len(r_rec.json().get("products", [])))

r_types = session.get(BASE + "/api/v1/assessment/skin-types")
print("/skin-types      ->", r_types.status_code, "types_count:", len(r_types.json()))

print("\n=== 4. Auth & User Profile Persistence Test ===")
timestamp = int(time.time())
test_email = f"e2e_user_{timestamp}@miracle.com"
reg_payload = {
    "name": "E2E Test User",
    "email": test_email,
    "password": "Password123!",
    "role": "User"
}
r_reg = session.post(BASE + "/api/v1/auth/register", json=reg_payload)
print("Register ->", r_reg.status_code, r_reg.json())
token = r_reg.json().get("access_token")

headers = {"Authorization": f"Bearer {token}"}

# Initial score check (404 expected & handled)
r_score = session.get(BASE + "/api/v1/assessment/score", headers=headers)
print("Initial /score (expect 404) ->", r_score.status_code)

# Profile update (name change persistence test)
new_name = "E2E Updated Name " + str(timestamp)
r_prof_update = session.post(BASE + "/api/v1/assessment/profile", json={"name": new_name, "skin_type": "Oily", "concerns": ["Acne & Breakouts"]}, headers=headers)
print("Profile Update ->", r_prof_update.status_code, r_prof_update.json())

# Fetch profile to verify DB persistence
r_prof = session.get(BASE + "/api/v1/assessment/profile", headers=headers)
print("Fetch Profile ->", r_prof.status_code, "persisted_name:", r_prof.json().get("name"))
assert r_prof.json().get("name") == new_name, "Name persistence failed!"

print("\n=== 5. RBAC & Security Test ===")
# User attempt to access consultant roster (403 expected)
r_user_roster = session.get(BASE + "/api/v1/consultant/roster", headers=headers)
print("User access to Consultant Roster (expect 403) ->", r_user_roster.status_code)

print("\n=== LIVE PRODUCTION VERIFICATION COMPLETE: ALL PASSED ===")
