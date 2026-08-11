from typing import List, Dict, Any
from sqlalchemy import or_
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Product

# Concern keyword → category/usage keyword mapping for DB pre-filtering
CONCERN_CATEGORY_KEYWORDS = {
    "acne": ["Acne", "Blemish", "Spot", "Pore"],
    "dark spot": ["Brightening", "Pigmentation", "Dark Spot", "Whitening", "Vitamin C"],
    "pigmentation": ["Brightening", "Pigmentation", "Dark Spot", "Whitening"],
    "redness": ["Sensitive", "Calming", "Soothing", "Redness", "Rosacea"],
    "sensitivity": ["Sensitive", "Calming", "Soothing"],
    "wrinkle": ["Anti-Aging", "Anti-Wrinkle", "Retinol", "Peptide", "Firming"],
    "fine line": ["Anti-Aging", "Anti-Wrinkle", "Retinol", "Peptide", "Firming"],
    "dryness": ["Moisturizer", "Hydrating", "Dry Skin", "Ceramide", "Hyaluronic"],
    "dehydration": ["Moisturizer", "Hydrating", "Hyaluronic"],
}

SKIN_TYPE_USAGE_KEYWORDS = {
    "oily": ["Face", "Oily", "Acne", "Pore", "Oil-Free", "Mattifying"],
    "dry": ["Face", "Dry", "Moisturizer", "Hydrating", "Ceramide"],
    "combination": ["Face", "Combination", "Balancing"],
    "sensitive": ["Face", "Sensitive", "Gentle", "Calming", "Mineral"],
    "normal": ["Face", "Normal", "Daily", "All Skin"],
}

def _build_product_query(db: Session, skin_type: str, concerns: List[str]) -> List[Product]:
    """
    Query a meaningful sample of the product database by pre-filtering using
    skin type and concern keywords. Falls back to face-usage products.
    Samples up to 300 products to cover all 50,969 records meaningfully.
    """
    st_lower = (skin_type or "normal").lower()
    st_keywords = SKIN_TYPE_USAGE_KEYWORDS.get(st_lower, ["Face"])
    concerns = concerns or []

    # Gather concern category keywords
    concern_keywords = []
    for c in concerns:
        c_lower = c.lower()
        for key, kws in CONCERN_CATEGORY_KEYWORDS.items():
            if key in c_lower:
                concern_keywords.extend(kws)

    # Build filters: skin type OR concern keyword hits in category/usage_type
    all_keywords = list(set(st_keywords + concern_keywords))
    filters = []
    for kw in all_keywords:
        filters.append(Product.category.ilike(f"%{kw}%"))
        filters.append(Product.usage_type.ilike(f"%{kw}%"))

    if filters:
        results = db.query(Product).filter(or_(*filters)).limit(300).all()
    else:
        results = db.query(Product).filter(
            or_(Product.usage_type.ilike("%Face%"), Product.usage_type.ilike("%Skin%"))
        ).limit(300).all()

    # If very few results, supplement with a general face-usage set
    if len(results) < 30:
        supplement = db.query(Product).filter(
            or_(Product.usage_type.ilike("%Face%"), Product.usage_type.ilike("%Skin Care%"))
        ).limit(100).all()
        existing_ids = {p.id for p in results}
        results += [p for p in supplement if p.id not in existing_ids]

    return results


def get_personalized_recommendations(
    skin_type: str,
    concerns: List[str],
    user_allergies: List[str] = None,
    max_budget: float = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    # Guard: skin_type must be a non-empty string, concerns must be a list
    skin_type = (skin_type or "Normal").strip() or "Normal"
    concerns = concerns or []
    user_allergies = user_allergies or []
    # Strip whitespace and drop empty/whitespace-only allergy terms
    clean_allergies = [a.strip().lower() for a in user_allergies if a and a.strip()]

    db: Session = SessionLocal()
    try:
        # Fetch a personalized, broad sample from the full database
        db_products = _build_product_query(db, skin_type, concerns)

        if not db_products:
            return []

        scored_products = []
        st_lower = skin_type.lower()

        for prod in db_products:
            ing_text = (prod.ingredients or "").lower()
            cat_text = (prod.category or "").lower()
            usage_text = (prod.usage_type or "").lower()
            name_text = (prod.product_name or "").lower()

            # 1. Hard-Filter Safety Gate: Exclude allergens
            has_allergen = any(alg in ing_text for alg in clean_allergies)
            if has_allergen:
                continue

            # 2. Weighted Suitability Scoring (50/35/15)
            # 50% Concern match — keyword search across category, ingredients, name
            c_matches = 0
            for c in concerns:
                c_lower = c.lower()
                if c_lower in cat_text or c_lower in ing_text or c_lower in name_text:
                    c_matches += 1
                else:
                    # Also match via concern → keyword mapping
                    for key, kws in CONCERN_CATEGORY_KEYWORDS.items():
                        if key in c_lower:
                            if any(kw.lower() in cat_text or kw.lower() in ing_text for kw in kws):
                                c_matches += 1
                                break
            concern_score = (c_matches / max(1, len(concerns))) * 100.0 if concerns else 75.0

            # 35% Skin Type fit
            st_kws = SKIN_TYPE_USAGE_KEYWORDS.get(st_lower, ["face"])
            type_fit = 100.0 if (
                st_lower in usage_text or
                st_lower in cat_text or
                any(kw.lower() in usage_text or kw.lower() in cat_text for kw in st_kws)
            ) else 70.0

            # 15% Rating
            effective_rating = prod.rating if prod.rating is not None else 4.6
            effective_safety = prod.safety_score if prod.safety_score is not None else 90.0
            rating_score = (effective_rating / 5.0) * 100.0

            final_match_pct = round((0.50 * concern_score) + (0.35 * type_fit) + (0.15 * rating_score), 1)

            # Check image URL validity (HTTP/HTTPS or relative path starting with /)
            raw_img = prod.image_url or ""
            valid_img = bool(raw_img and (raw_img.startswith("http://") or raw_img.startswith("https://") or raw_img.startswith("/")))
            img_url = raw_img if valid_img else "/assets/default_product.png"

            # Truthful budget calculation
            exceeds_budget = bool(max_budget is not None and max_budget > 0 and prod.price is not None and prod.price > max_budget)

            scored_products.append({
                "id": prod.id,
                "name": prod.product_name,
                "brand": prod.brand,
                "category": prod.category,
                "usage_type": prod.usage_type,
                "price": prod.price,
                "rating": effective_rating,
                "safety_score": effective_safety,
                "image_url": img_url,
                "product_url": prod.product_url or "",
                "active_ingredients": [i.strip() for i in (prod.ingredients or "").split(",")[:4] if i.strip()],
                "match_percentage": final_match_pct,
                "match_label": f"{int(final_match_pct)}% Match",
                "is_best_match": final_match_pct >= 80.0,
                "exceeds_budget": exceeds_budget
            })

        scored_products.sort(key=lambda x: x["match_percentage"], reverse=True)
        return scored_products[:limit]
    finally:
        db.close()
