from typing import List, Dict, Any

DEFAULT_TEMPLATES = {
    # --- Normal Skin: Balanced, maintenance-focused routine ---
    # Gentle actives, preventive antioxidants, lightweight hydration.
    # Does NOT share any cleanser, serum, or moisturizer with Combination.
    "Normal": {
        "AM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Gentle Micellar Foam Cleanser",           "active_ingredients": ["Micellar Water", "Aloe Vera"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Antioxidant Vitamin E + Green Tea Serum", "active_ingredients": ["Vitamin E", "Green Tea Extract", "Ferulic Acid"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "All-Day Balance Fluid Moisturizer",       "active_ingredients": ["Niacinamide", "Hyaluronic Acid", "Glycerin"]},
            {"step_number": 4, "step_category": "Sun Protection","product_name": "Invisible Daily Sunscreen SPF 50",         "active_ingredients": ["Zinc Oxide", "Vitamin C"]}
        ],
        "PM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Gel-to-Milk Nightly Cleanser",            "active_ingredients": ["Glycerin", "Panthenol"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Peptide Complex Firming Serum",            "active_ingredients": ["Matrixyl 3000", "Copper Peptides"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "Overnight Renewal Gel-Cream",             "active_ingredients": ["Ceramides", "Squalane", "Niacinamide"]}
        ]
    },
    # --- Oily Skin: Sebum control, BHA exfoliation, oil-free hydration ---
    "Oily": {
        "AM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Salicylic Acid Gentle Gel Cleanser",      "active_ingredients": ["Salicylic Acid (BHA)", "Tea Tree Oil"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Niacinamide 10% + Zinc Serum",            "active_ingredients": ["Niacinamide", "Zinc PCA"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "Oil-Free Lightweight Hydrating Gel",      "active_ingredients": ["Hyaluronic Acid", "Aloe Vera"]},
            {"step_number": 4, "step_category": "Sun Protection","product_name": "Matte Finish Broad Spectrum SPF 50",       "active_ingredients": ["Zinc Oxide", "Niacinamide"]}
        ],
        "PM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Double Cleanse Micellar + Gel Cleanser",  "active_ingredients": ["Salicylic Acid"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Exfoliating BHA Serum 2%",                "active_ingredients": ["Salicylic Acid"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "Barrier Support Moisturizing Gel",        "active_ingredients": ["Ceramides", "Hyaluronic Acid"]}
        ]
    },
    # --- Dry Skin: Deep hydration, rich emollients, gentle AHA exfoliation ---
    "Dry": {
        "AM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Hydrating Creamy Cleanser",               "active_ingredients": ["Glycerin", "Ceramides"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Hyaluronic Acid 2% + B5 Serum",           "active_ingredients": ["Hyaluronic Acid", "Vitamin B5"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "Rich Barrier Repair Cream",               "active_ingredients": ["Ceramides", "Peptides", "Shea Butter"]},
            {"step_number": 4, "step_category": "Sun Protection","product_name": "Nourishing Dewy Sunscreen SPF 50",         "active_ingredients": ["Hyaluronic Acid", "Squalane"]}
        ],
        "PM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Gentle Cleansing Milk",                   "active_ingredients": ["Glycerin"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Gentle Lactic Acid 5% Serum",             "active_ingredients": ["Lactic Acid (AHA)"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "Deep Recovery Ceramide Cream",            "active_ingredients": ["Ceramides", "Fatty Acids"]}
        ]
    },
    # --- Sensitive Skin: Fragrance-free, mineral sunscreen, no harsh actives ---
    "Sensitive": {
        "AM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Ultra-Soothing Oat Cleanser",             "active_ingredients": ["Colloidal Oat", "Centella Asiatica"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Calming Centella Serum",                  "active_ingredients": ["Centella Asiatica", "Madecassoside"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "Barrier Relief Soothing Lotion",          "active_ingredients": ["Ceramides", "Panthenol"]},
            {"step_number": 4, "step_category": "Sun Protection","product_name": "Mineral Sensitive Skin Sunscreen SPF 50", "active_ingredients": ["Zinc Oxide", "Titanium Dioxide"]}
        ],
        "PM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Ultra-Soothing Oat Cleanser",             "active_ingredients": ["Colloidal Oat"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Azelaic Acid 10% Calming Treatment",      "active_ingredients": ["Azelaic Acid"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "Intensive Barrier Recovery Cream",        "active_ingredients": ["Ceramides", "Squalane"]}
        ]
    },
    # --- Combination Skin: Zone-balanced, pore-refining + hydration ---
    "Combination": {
        "AM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Balancing Gel Cleanser",                  "active_ingredients": ["Niacinamide", "Glycerin"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Vitamin C 10% Brightening Serum",         "active_ingredients": ["Vitamin C", "Ferulic Acid"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "Lightweight Hydrating Lotion",            "active_ingredients": ["Hyaluronic Acid", "Niacinamide"]},
            {"step_number": 4, "step_category": "Sun Protection","product_name": "Daily Invisible Fluid SPF 50",             "active_ingredients": ["Zinc Oxide"]}
        ],
        "PM": [
            {"step_number": 1, "step_category": "Cleansing",     "product_name": "Gentle Foaming Cleanser",                 "active_ingredients": ["Glycerin"]},
            {"step_number": 2, "step_category": "Treatment",     "product_name": "Retinol 0.2% Renewal Serum",              "active_ingredients": ["Retinol"]},
            {"step_number": 3, "step_category": "Moisturizing",  "product_name": "Night Repair Moisturizer",                "active_ingredients": ["Ceramides", "Peptides"]}
        ]
    }
}

def generate_customized_routine(skin_type: str, concerns_severity: Dict[str, int]) -> List[Dict[str, Any]]:
    clean_skin_type = (skin_type or "").strip().title()
    base_type = clean_skin_type if clean_skin_type in DEFAULT_TEMPLATES else "Combination"
    template = DEFAULT_TEMPLATES[base_type]
    
    is_sensitive = clean_skin_type == "Sensitive" or concerns_severity.get("redness_severity", 0) >= 7
    
    routine_steps = []
    
    for tod in ["AM", "PM"]:
        steps = template.get(tod, [])
        for step in steps:
            step_copy = dict(step)
            step_copy["time_of_day"] = tod
            
            # Apply Safety Guardrail: Drop harsh exfoliants / strong retinoids for sensitive skin
            if is_sensitive:
                actives = step_copy.get("active_ingredients", [])
                harsh_set = {
                    "Retinol", "Retinoids", "Tretinoin",
                    "Salicylic Acid (BHA)", "Salicylic Acid",
                    "Glycolic Acid", "Lactic Acid (AHA)", "Lactic Acid", "Mandelic Acid", "AHAs/BHA",
                    "Benzoyl Peroxide"
                }
                harsh = any(a in harsh_set for a in actives)
                if harsh:
                    step_copy["product_name"] = "Soothing Centella Barrier Recovery Gel"
                    step_copy["active_ingredients"] = ["Centella Asiatica", "Azelaic Acid"]
            
            routine_steps.append(step_copy)

    # Add Weekly Highlight Step
    routine_steps.append({
        "time_of_day": "Weekly",
        "step_number": 1,
        "step_category": "Treatment",
        "product_name": "Hydrating & Soothing Bio-Cellulose Sheet Mask",
        "active_ingredients": ["Hyaluronic Acid", "Centella Asiatica"]
    })
    
    return routine_steps
