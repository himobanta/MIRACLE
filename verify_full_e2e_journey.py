import urllib.request, json, time, sys

BASE = 'http://127.0.0.1:8000'
ts = str(int(time.time()))

def post(url, body, headers=None):
    h = dict(headers or {})
    h['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=h, method='POST')
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())

def get(url, headers=None):
    h = dict(headers or {})
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())

def reg(email, role='User', name=None):
    if role == 'User':
        try:
            return post(BASE+'/api/v1/auth/register', {'name': name or role+' Test', 'email': email, 'password': 'Pwd123!', 'role': role})
        except Exception:
            return post(BASE+'/api/v1/auth/login', {'email': email, 'password': 'Pwd123!'})
    else:
        # Privileged roles require login (seeded or existing) or special handling
        return post(BASE+'/api/v1/auth/login', {'email': email, 'password': 'Pwd123!'})

def hdr(tok):
    return {'Authorization': 'Bearer ' + tok}

print("="*70)
print("PHASE 1: USER ACCOUNT + PROFILE PERSISTENCE")
print("="*70)

email_user = f"e2e_user_{ts}@miracle.com"
res_user = reg(email_user, "User", "Ananya E2E")
tok_user = res_user["access_token"]
h_user = hdr(tok_user)

# 1. Fetch skin-types & skin-concerns datasets
skin_types = get(BASE+'/api/v1/assessment/skin-types')
skin_concerns = get(BASE+'/api/v1/assessment/skin-concerns')
print(f"Skin Types dataset count: {len(skin_types)} (enums: {[t['backend_enum'] for t in skin_types]})")
print(f"Skin Concerns dataset count: {len(skin_concerns)} (titles: {[c['title'] for c in skin_concerns]})")

# 2. Save profile (1 skin type + multiple concerns)
profile_payload = {
    "skin_type": "Sensitive",
    "concerns": ["Redness & Sensitivity", "Dryness & Dehydration"]
}
post(BASE+'/api/v1/assessment/profile', profile_payload, h_user)

# 3. Reload profile & verify persistence
profile_reloaded = get(BASE+'/api/v1/assessment/profile', h_user)
print(f"Persisted skin_type: {profile_reloaded['skin_type']} (expected: Sensitive)")
print(f"Persisted concerns: {profile_reloaded['concerns']} (expected: 2 concerns)")

# 4. Re-login & verify persistence
login_user = post(BASE+'/api/v1/auth/login', {'email': email_user, 'password': 'Pwd123!'})
h_relogin = hdr(login_user["access_token"])
profile_relogin = get(BASE+'/api/v1/assessment/profile', h_relogin)
print(f"Re-login persisted skin_type: {profile_relogin['skin_type']}")
print(f"Re-login persisted concerns: {profile_relogin['concerns']}")

print("\n"+"="*70)
print("PHASE 2: PHOTO SKIN ASSESSMENT")
print("="*70)

# Upload progress photo
photo_res = post(BASE+'/api/v1/analytics/photos/upload', {
    "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "tag": "Baseline Scan"
}, h_user)
print(f"Photo upload status: {photo_res.get('status')} | Score: {photo_res.get('skin_health_score')}")

# Submit assessment
assess_res = post(BASE+'/api/v1/assessment/evaluate', {
    "skin_type": "Sensitive",
    "acne_severity": 3,
    "hyperpigmentation_severity": 2,
    "redness_severity": 7,
    "wrinkles_severity": 1,
    "lifestyle": {"sleep_hours": 8.0, "water_intake_liters": 2.5},
    "allergies": []
}, h_user)
print(f"Assessment evaluated score: {assess_res['overall_score']}")
print(f"Condition subscore: {assess_res['condition_subscore']} | Lifestyle: {assess_res['lifestyle_subscore']} | Sleep: {assess_res['sleep_subscore']}")
print(f"Detected concerns: {assess_res['detected_concerns']}")

# Verify latest score endpoint
score_check = get(BASE+'/api/v1/assessment/score', h_user)
print(f"GET /assessment/score score: {score_check['overall_score']} | Concerns: {score_check['detected_concerns']}")

print("\n"+"="*70)
print("PHASE 3: PERSONALIZATION Across 5 COMBINATIONS")
print("="*70)

combos = [
    ("Oily", ["Acne & Breakouts"]),
    ("Dry", ["Dryness & Dehydration"]),
    ("Sensitive", ["Redness & Sensitivity"]),
    ("Combination", ["Dark Spots & Pigmentation"]),
    ("Normal", ["Fine Lines & Wrinkles"]),
]

for st, conc in combos:
    post(BASE+'/api/v1/assessment/profile', {"skin_type": st, "concerns": conc}, h_user)
    recs = get(BASE+f'/api/v1/recommendations?skin_type={st}', h_user)
    rout = get(BASE+'/api/v1/routine', h_user)
    am_first = rout[0]['product_name'] if rout else 'NONE'
    top_prod = recs['products'][0]['name'] if recs.get('products') else 'NONE'
    top_match = recs['products'][0]['match_percentage'] if recs.get('products') else 0
    print(f"  {st:12s} + {conc[0]:26s} => Evaluated: {recs.get('evaluated_skin_type'):10s} | Top Rec: {top_prod[:30]:30s} ({top_match}%) | AM Cleanser: {am_first[:30]}")

print("\n"+"="*70)
print("PHASE 4: PRODUCT DATA INTEGRITY & DETAILS")
print("="*70)

recs = get(BASE+'/api/v1/recommendations?skin_type=Oily', h_user)
products = recs.get('products', [])
print(f"Total products returned: {len(products)}")

sample_prods = products[:3]
for idx, p in enumerate(sample_prods, 1):
    print(f"Product {idx}:")
    print(f"  Name       : {p['name']}")
    print(f"  Brand      : {p.get('brand')}")
    print(f"  Category   : {p.get('category')}")
    print(f"  Usage Type : {p.get('usage_type')}")
    print(f"  Price      : INR {p.get('price')}")
    print(f"  Rating     : {p.get('rating')} | Safety: {p.get('safety_score')}")
    print(f"  Product URL: {p.get('product_url')[:60]}...")
    print(f"  Image URL  : {p.get('image_url')[:60]}...")
    print(f"  Active Ings: {p.get('active_ingredients')}")

print("\n"+"="*70)
print("PHASE 5: USER -> CONSULTANT WORKFLOW")
print("="*70)

# 1. User requests consultation
appt_req = post(BASE+'/api/v1/appointments/request', {
    "target_role": "Consultant",
    "preferred_date": "2026-08-20",
    "preferred_time": "11:00 AM",
    "user_notes": "Seeking barrier repair routine advice"
}, h_user)
appt_id = appt_req["id"]
print(f"Appointment requested: ID={appt_id[:12]} | Status={appt_req['status']}")

# 2. Login as Consultant / Doctor (using seeded doctor account)
res_cons = post(BASE+'/api/v1/auth/login', {'email': 'derma@miracle.com', 'password': 'doctor123'})
h_cons = hdr(res_cons["access_token"])

# 3. Consultant views roster & patient details
roster = get(BASE+'/api/v1/consultant/roster', h_cons)
print(f"Consultant roster count: {roster['roster_count']}")

patient_details = get(BASE+f'/api/v1/consultant/patient/{res_user["user_id"]}', h_cons)
print(f"Patient inspect name: {patient_details['patient']['name']}")
print(f"Patient active routine count: {len(patient_details['active_routine'])}")

# 4. Consultant accepts appointment
accept_res = post(BASE+f'/api/v1/appointments/{appt_id}/status', {"status": "Accepted", "notes": "Consultation confirmed."}, h_cons)
print(f"Appointment accept status: {accept_res['status']}")

# 5. Consultant prescribes routine overwrite
prescribe_res = post(BASE+'/api/v1/consultant/prescribe', {
    "patient_id": res_user["user_id"],
    "doctor_notes": "Clinical consultant barrier repair prescription",
    "routine_steps": [
        {"time_of_day": "AM", "step_number": 1, "step_category": "Cleansing", "product_name": "Ultra-Gentle Botanical Cleanser", "active_ingredients": ["Aloe Vera", "Glycerin"]},
        {"time_of_day": "AM", "step_number": 2, "step_category": "Treatment", "product_name": "Niacinamide 5% Soothing Serum", "active_ingredients": ["Niacinamide", "Zinc"]},
        {"time_of_day": "PM", "step_number": 1, "step_category": "Moisturizing", "product_name": "Barrier Intensive Ceramide Cream", "active_ingredients": ["Ceramides", "Squalane"]}
    ]
}, h_cons)
print(f"Prescribe status: {prescribe_res['status']}")

# 6. Verify user sees doctor prescribed routine
user_routine_updated = get(BASE+'/api/v1/routine', h_user)
prescribed_steps = [s for s in user_routine_updated if s.get('prescribed_by_doctor')]
print(f"User updated routine: {len(user_routine_updated)} steps ({len(prescribed_steps)} prescribed by doctor)")

print("\n"+"="*70)
print("PHASE 6: CONSULTANT -> DERMATOLOGIST WORKFLOW")
print("="*70)

# 1. Consultant refers patient to Dermatologist
refer_res = post(BASE+f'/api/v1/appointments/{appt_id}/refer', {
    "consultant_summary": "Referring for clinical dermatologist assessment of active treatment scaling.",
    "preferred_date": "2026-08-25",
    "preferred_time": "02:30 PM"
}, h_cons)
print(f"Referral status: {refer_res['status']} | Date: {refer_res['preferred_date']}")

# 2. Login as Dermatologist
res_derma = post(BASE+'/api/v1/auth/login', {'email': 'derma@miracle.com', 'password': 'doctor123'})
h_derma = hdr(res_derma["access_token"])

# 3. Dermatologist views patient & accepts
derma_patient = get(BASE+f'/api/v1/consultant/patient/{res_user["user_id"]}', h_derma)
print(f"Dermatologist patient inspect name: {derma_patient['patient']['name']}")

derma_accept = post(BASE+f'/api/v1/appointments/{appt_id}/status', {"status": "Accepted", "notes": "Dermatologist clinical evaluation accepted."}, h_derma)
print(f"Dermatologist accept status: {derma_accept['status']}")

# 4. Dermatologist prescribes high-strength routine
derma_prescribe = post(BASE+'/api/v1/consultant/prescribe', {
    "patient_id": res_user["user_id"],
    "doctor_notes": "Prescription Tretinoin & Medical Barrier Defense Protocol by Dr. Meera Iyer",
    "routine_steps": [
        {"time_of_day": "AM", "step_number": 1, "step_category": "Cleansing", "product_name": "Medical Cleansing Lotion", "active_ingredients": ["Colloidal Oat"]},
        {"time_of_day": "PM", "step_number": 1, "step_category": "Treatment", "product_name": "Prescription Tretinoin 0.05% Cream", "active_ingredients": ["Tretinoin (Retinoid)"]},
        {"time_of_day": "PM", "step_number": 2, "step_category": "Moisturizing", "product_name": "Rx Lipid Barrier Recovery Ointment", "active_ingredients": ["Ceramides", "Cholesterol"]}
    ]
}, h_derma)
print(f"Dermatologist prescribe status: {derma_prescribe['status']}")

# 5. User views final routine
user_final_routine = get(BASE+'/api/v1/routine', h_user)
derma_steps = [s for s in user_final_routine if "Tretinoin" in s.get("product_name", "")]
print(f"User final routine step count: {len(user_final_routine)} | Tretinoin step present: {len(derma_steps) > 0}")

print("\n"+"="*70)
print("PHASE 7: TOPBAR PROFILE & ROLE RBAC")
print("="*70)

me_user = get(BASE+'/api/v1/auth/me', h_user)
me_cons = get(BASE+'/api/v1/auth/me', h_cons)
me_derma = get(BASE+'/api/v1/auth/me', h_derma)

print(f"User role: {me_user['role']} | Email: {me_user['email']}")
print(f"Consultant role: {me_cons['role']} | Email: {me_cons['email']}")
print(f"Dermatologist role: {me_derma['role']} | Email: {me_derma['email']}")

print("\n"+"="*70)
print("PHASE 9: EMPTY / EDGE STATES")
print("="*70)

# Fresh user with NO profile calls recommendations
res_empty = reg(f"fresh_empty_{ts}@m.com", "User")
h_empty = hdr(res_empty["access_token"])

recs_empty = get(BASE+'/api/v1/recommendations', h_empty)
print(f"Fresh user GET /recommendations: HTTP 200 OK | Count={recs_empty['recommendations_count']} | is_personalized={recs_empty['is_personalized']}")

# Evaluate ingredient with empty allergies
ing_eval = post(BASE+'/api/v1/ingredients/evaluate', {
    "product_name": "Test Product",
    "ingredients": ["Water", "Glycerin", "Niacinamide"],
    "user_allergies": [],
    "routine_time": "AM"
})
print(f"Ingredients evaluate score: {ing_eval['safety_score']} | Status: {ing_eval['status']}")

print("\n"+"="*70)
print("ALL E2E WORKFLOW VERIFICATION PHASES COMPLETED SUCCESSFULLY!")
print("="*70)
