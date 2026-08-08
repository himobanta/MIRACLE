"""
verify_rbac_403.py
Verifies that the consultant router returns HTTP 403 (not 430) for unauthorized role access,
and confirms all other RBAC and auth edge cases after the 430 -> 403 fix.
"""
import urllib.request
import urllib.error
import json
import time

BASE = "http://127.0.0.1:8000/api/v1"
TS = int(time.time())
PASSES = []
FAILS = []

def req(method, path, token=None, body=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, {}

def check(label, actual, expected):
    ok = actual == expected
    sym = "PASS" if ok else "FAIL"
    print(f"  {sym}: {label} -> HTTP {actual} (expected {expected})")
    if ok:
        PASSES.append(label)
    else:
        FAILS.append(f"{label}: got {actual}, expected {expected}")

print("=" * 60)
print("RBAC + HTTP 403 VERIFICATION (post 430->403 fix)")
print("=" * 60)

# 1. Register a plain User
s, d = req("POST", "/auth/register", body={
    "name": f"RBAC User {TS}",
    "email": f"rbac_user_{TS}@miracle.com",
    "password": "testpass123",
    "role": "User"
})
user_token = d.get("access_token", "")
check("User registration", s, 200)

# 2. User attempting to access consultant roster -> 403
s, _ = req("GET", "/consultant/roster", token=user_token)
check("User -> GET /consultant/roster: expect 403", s, 403)

# 3. User attempting to access a patient record -> 403
s, _ = req("GET", "/consultant/patient/some-fake-patient-id", token=user_token)
check("User -> GET /consultant/patient/: expect 403", s, 403)

# 4. User attempting to update appointment status -> 403
s, d2 = req("POST", "/appointments/request", token=user_token, body={
    "target_role": "Consultant",
    "preferred_date": "2026-09-01",
    "preferred_time": "10:00 AM",
    "user_notes": "RBAC test"
})
appt_id = d2.get("id", "nonexistent-id")
check("User creates appointment", s, 200)

s, _ = req("POST", f"/appointments/{appt_id}/status", token=user_token, body={"status": "Accepted"})
check("User -> POST /appointments/status: expect 403", s, 403)

# 5. User attempting referral -> 403
s, _ = req("POST", f"/appointments/{appt_id}/refer", token=user_token, body={"consultant_summary": "test"})
check("User -> POST /appointments/refer: expect 403", s, 403)

# 6. Register a Skincare Consultant
s, d = req("POST", "/auth/register", body={
    "name": f"Cons {TS}",
    "email": f"rbac_cons_{TS}@miracle.com",
    "password": "testpass123",
    "role": "Skincare Consultant"
})
cons_token = d.get("access_token", "")
check("Consultant registration", s, 200)

# 7. Consultant can access roster -> 200
s, _ = req("GET", "/consultant/roster", token=cons_token)
check("Consultant -> GET /consultant/roster: expect 200", s, 200)

# 8. Consultant updating appointment status with valid status -> 200
s, _ = req("POST", f"/appointments/{appt_id}/status", token=cons_token, body={"status": "Accepted", "notes": "Approved"})
check("Consultant -> POST /appointments/status Accepted: expect 200", s, 200)

# 9. Consultant updating with invalid/hacked status -> 400
s, _ = req("POST", f"/appointments/{appt_id}/status", token=cons_token, body={"status": "HACKED_STATUS"})
check("Consultant -> invalid status 'HACKED_STATUS': expect 400", s, 400)

# 10. Invalid JWT -> 401
s, _ = req("GET", "/auth/me", token="invalid.jwt.token")
check("Invalid JWT -> /auth/me: expect 401", s, 401)

# 11. No token -> 422 (FastAPI body validation) or 401 
s, _ = req("GET", "/auth/me")
check("No JWT -> /auth/me: expect 401", s, 401)

# 12. Empty profile user -> /recommendations -> 200 (not 500)
s, dr = req("POST", "/auth/register", body={
    "name": f"Empty {TS}",
    "email": f"rbac_empty_{TS}@miracle.com",
    "password": "testpass123",
    "role": "User"
})
empty_token = dr.get("access_token", "")
s2, _ = req("GET", "/recommendations", token=empty_token)
check("Empty profile -> GET /recommendations: expect 200 (not 500)", s2, 200)

# 13. Register Dermatologist, confirm they can accept appointments
s, d = req("POST", "/auth/register", body={
    "name": f"Derma {TS}",
    "email": f"rbac_derma_{TS}@miracle.com",
    "password": "testpass123",
    "role": "Dermatologist"
})
derma_token = d.get("access_token", "")
check("Dermatologist registration", s, 200)

s, _ = req("POST", f"/appointments/{appt_id}/status", token=derma_token, body={"status": "Completed", "notes": "Completed by derma"})
check("Dermatologist -> POST /appointments/status Completed: expect 200", s, 200)

print()
print("=" * 60)
print(f"RESULTS: {len(PASSES)} PASSED, {len(FAILS)} FAILED")
if FAILS:
    for f in FAILS:
        print(f"  FAIL: {f}")
else:
    print("ALL RBAC / HTTP STATUS CHECKS PASSED")
print("=" * 60)
