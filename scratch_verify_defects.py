import urllib.request, json, time

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

def reg(email, role='User'):
    return post(BASE+'/api/v1/auth/register', {'name': 'Test User', 'email': email, 'password': 'Pwd123!', 'role': role})

def hdr(tok):
    return {'Authorization': 'Bearer ' + tok}

print("=========================================")
print("VERIFICATION 1: EMPTY PROFILE USER GET /recommendations")
print("=========================================")
email_fresh = f'fresh_empty_{ts}@m.com'
res_fresh = reg(email_fresh)
h_fresh = hdr(res_fresh['access_token'])

recs = get(BASE+'/api/v1/recommendations', h_fresh)
print("Status: 200 OK (no 500!)")
print("evaluated_skin_type:", recs.get("evaluated_skin_type"))
print("is_personalized:", recs.get("is_personalized"))
print("recommendations_count:", recs.get("recommendations_count"))
print("First product:", recs.get("products", [{}])[0].get("name"))

print("\n=========================================")
print("VERIFICATION 2: NORMAL SKIN ROUTINE vs COMBINATION")
print("=========================================")
# User with Normal skin profile
email_norm = f'normal_{ts}@m.com'
res_norm = reg(email_norm)
h_norm = hdr(res_norm['access_token'])
post(BASE+'/api/v1/assessment/profile', {'skin_type': 'Normal', 'concerns': []}, h_norm)
post(BASE+'/api/v1/assessment/evaluate', {
    'skin_type': 'Normal', 'acne_severity': 0, 'hyperpigmentation_severity': 0,
    'redness_severity': 0, 'wrinkles_severity': 0,
    'lifestyle': {'stress_level': 2, 'sun_exposure': 'Low', 'sleep_hours': 8.0, 'water_intake_liters': 3.0},
    'allergies': []
}, h_norm)
norm_routine = get(BASE+'/api/v1/routine', h_norm)
norm_am = [s['product_name'] for s in norm_routine if s['time_of_day'] == 'AM']

# User with Combination skin profile
email_combo = f'combo_{ts}@m.com'
res_combo = reg(email_combo)
h_combo = hdr(res_combo['access_token'])
post(BASE+'/api/v1/assessment/profile', {'skin_type': 'Combination', 'concerns': []}, h_combo)
post(BASE+'/api/v1/assessment/evaluate', {
    'skin_type': 'Combination', 'acne_severity': 0, 'hyperpigmentation_severity': 0,
    'redness_severity': 0, 'wrinkles_severity': 0,
    'lifestyle': {'stress_level': 2, 'sun_exposure': 'Low', 'sleep_hours': 8.0, 'water_intake_liters': 3.0},
    'allergies': []
}, h_combo)
combo_routine = get(BASE+'/api/v1/routine', h_combo)
combo_am = [s['product_name'] for s in combo_routine if s['time_of_day'] == 'AM']

print("Normal AM Cleanser:", norm_am[0] if norm_am else "None")
print("Combination AM Cleanser:", combo_am[0] if combo_am else "None")
print("Distinct routines:", norm_am != combo_am)

print("\n=========================================")
print("VERIFICATION 3: CANONICAL INGREDIENTS EVALUATE ENDPOINT")
print("=========================================")
ing_res = post(BASE+'/api/v1/ingredients/evaluate', {
    'product_name': 'Test Retinol+BHA Cleanser',
    'ingredients': ['Retinol', 'Salicylic Acid', 'Water'],
    'user_allergies': ['Salicylic Acid'],
    'routine_time': 'PM'
})
print("Canonical endpoint /api/v1/ingredients/evaluate returned:")
print("  Safety score:", ing_res.get("safety_score"))
print("  Status:", ing_res.get("status"))
print("  Allergy alerts:", ing_res.get("allergy_alerts"))
print("  Conflict warnings:", ing_res.get("conflict_warnings"))

# Check legacy alias also works
alias_res = post(BASE+'/api/v1/ingredient/evaluate', {
    'product_name': 'Test Retinol+BHA Cleanser',
    'ingredients': ['Retinol', 'Salicylic Acid', 'Water'],
    'user_allergies': [],
    'routine_time': 'PM'
})
print("Alias endpoint /api/v1/ingredient/evaluate returned:")
print("  Safety score:", alias_res.get("safety_score"))

print("\n=========================================")
print("VERIFICATION 4: RECOMMENDATIONS MULTI-SKIN TYPE & CONCERN")
print("=========================================")
for st in ['Dry', 'Oily', 'Sensitive']:
    r = post(BASE+'/api/v1/recommendations', {'skin_type': st, 'concerns': ['Acne & Breakouts', 'Redness & Sensitivity']})
    prods = r.get("products", [])
    print(f"Skin type: {st:10s} | Products returned: {len(prods)} | Top item: {prods[0]['name'][:45] if prods else 'None'}")

print("\nALL VERIFICATION STEPS COMPLETE!")
