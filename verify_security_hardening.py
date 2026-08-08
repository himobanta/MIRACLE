import urllib.request, json, time

BASE = 'http://127.0.0.1:8000'
ts = str(int(time.time()))

def raw_post(url, body, headers=None):
    h = dict(headers or {})
    h['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=h, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def raw_get(url, headers=None):
    h = dict(headers or {})
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

# Register regular User & Consultant
_, u_res = raw_post(BASE+'/api/v1/auth/register', {'name':'Security User','email':f'sec_{ts}@m.com','password':'Pwd123!','role':'User'})
u_tok = u_res['access_token']
u_hdr = {'Authorization': 'Bearer ' + u_tok}

_, c_res = raw_post(BASE+'/api/v1/auth/register', {'name':'Security Consultant','email':f'sec_c_{ts}@m.com','password':'Pwd123!','role':'Skincare Consultant'})
c_tok = c_res['access_token']
c_hdr = {'Authorization': 'Bearer ' + c_tok}

print("="*60)
print("SECURITY TEST 1: PHOTO URL SCHEME VALIDATION")
print("="*60)

# Valid schemes
for url in ["http://example.com/scan.jpg", "https://cdn.skinsafeproducts.com/photo/1.png", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="]:
    status, body = raw_post(BASE+'/api/v1/analytics/photos/upload', {'image_url': url, 'tag': 'Test'}, u_hdr)
    print(f"  Valid URL scheme '{url[:30]}...': Status={status} (expected 200)")

# Invalid schemes
for url in ["file:///etc/passwd", "javascript:alert('xss')", "ftp://malicious.com/scan.png", ""]:
    status, body = raw_post(BASE+'/api/v1/analytics/photos/upload', {'image_url': url, 'tag': 'Test'}, u_hdr)
    print(f"  Invalid URL scheme '{url[:30]}': Status={status} (expected 400)")

print()
print("="*60)
print("SECURITY TEST 2: APPOINTMENT STATUS & ROLE AUTHORIZATION")
print("="*60)

# Create an appointment as User
_, appt = raw_post(BASE+'/api/v1/appointments/request', {'target_role':'Consultant','preferred_date':'2026-08-30','preferred_time':'10:00 AM'}, u_hdr)
appt_id = appt['id']

# 1. User attempts to update appointment status (must be HTTP 403)
st, body = raw_post(BASE+f'/api/v1/appointments/{appt_id}/status', {'status':'Accepted'}, u_hdr)
print(f"  User updating appointment status: Status={st} (expected 403)")

# 2. Consultant updates status with invalid enum (must be HTTP 400)
st, body = raw_post(BASE+f'/api/v1/appointments/{appt_id}/status', {'status':'HACKED_STATUS'}, c_hdr)
print(f"  Consultant updating with invalid status 'HACKED_STATUS': Status={st} (expected 400)")

# 3. Consultant updates status with valid enum (must be HTTP 200)
st, body = raw_post(BASE+f'/api/v1/appointments/{appt_id}/status', {'status':'Accepted'}, c_hdr)
print(f"  Consultant updating with valid status 'Accepted': Status={st} (expected 200)")

# 4. User attempts to refer patient to dermatologist (must be HTTP 403)
st, body = raw_post(BASE+f'/api/v1/appointments/{appt_id}/refer', {'consultant_summary':'unauthorized'}, u_hdr)
print(f"  User attempting dermatologist referral: Status={st} (expected 403)")

print()
print("="*60)
print("SECURITY TEST 3: INVALID/EXPIRED JWT TOKEN")
print("="*60)

bad_hdr = {'Authorization': 'Bearer invalid.jwt.token'}
st, body = raw_get(BASE+'/api/v1/auth/me', bad_hdr)
print(f"  Invalid JWT token request to /auth/me: Status={st} (expected 401)")

print()
print("="*60)
print("ALL SECURITY HARDENING TESTS COMPLETED!")
print("="*60)
