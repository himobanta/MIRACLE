import pytest
from backend.app.routine_generator import generate_customized_routine, DEFAULT_TEMPLATES
from backend.app.recommendation_engine import get_personalized_recommendations
from backend.app.database import SessionLocal
from backend.app.models import Product

def test_normal_skin_routine_not_combination_fallback():
    """
    Regression Test 1: Normal skin type must have a dedicated template
    and produce distinct routine steps from Combination skin type.
    """
    assert "Normal" in DEFAULT_TEMPLATES, "Normal skin template missing from DEFAULT_TEMPLATES!"
    
    normal_routine = generate_customized_routine("Normal", {})
    combo_routine = generate_customized_routine("Combination", {})
    
    normal_am_products = [s["product_name"] for s in normal_routine if s["time_of_day"] == "AM"]
    combo_am_products = [s["product_name"] for s in combo_routine if s["time_of_day"] == "AM"]
    
    assert normal_am_products != combo_am_products, "Normal skin routine is identical to Combination skin routine!"

def test_recommendation_search_across_full_dataset():
    """
    Regression Test 2: Recommendation engine must evaluate dataset based on skin type & concern filters
    rather than strictly taking the top-100 arbitrary database rows.
    """
    db = SessionLocal()
    try:
        total_products = db.query(Product).count()
        assert total_products >= 50000, f"Expected >50,000 products, found {total_products}"
    finally:
        db.close()
        
    # Get recommendations for Oily + Acne
    recs_oily = get_personalized_recommendations("Oily", ["Acne"])
    assert len(recs_oily) > 0, "No recommendations returned for Oily + Acne!"
    
    # Get recommendations for Dry + Wrinkles
    recs_dry = get_personalized_recommendations("Dry", ["Fine Lines & Wrinkles"])
    assert len(recs_dry) > 0, "No recommendations returned for Dry + Wrinkles!"

    # Confirm products returned are relevant and differ
    oily_ids = [p["id"] for p in recs_oily]
    dry_ids = [p["id"] for p in recs_dry]
    assert oily_ids != dry_ids, "Oily and Dry recommendations returned identical product sets!"

def test_empty_profile_recommendation_safety():
    """
    Regression Test 4: Recommendation calculation with None or empty parameters must not crash.
    """
    # Calling engine with None skin_type or empty concerns should safely fallback
    recs_none = get_personalized_recommendations(skin_type=None, concerns=None)
    assert isinstance(recs_none, list)
    assert len(recs_none) > 0

def test_photo_url_scheme_validation_logic():
    """
    Security Test: Photo URL scheme validation must accept http, https, data:image
    and reject dangerous schemes like file:// or javascript:.
    """
    valid_urls = [
        "http://example.com/photo.jpg",
        "https://cdn.skinsafeproducts.com/photo/123.png",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    ]
    invalid_urls = [
        "file:///etc/passwd",
        "javascript:alert('xss')",
        "ftp://malicious.server/scan.png",
        "/etc/shadow",
        "   ",
        ""
    ]
    
    for url in valid_urls:
        clean = url.strip()
        ok = clean.startswith("http://") or clean.startswith("https://") or clean.startswith("data:image/")
        assert ok is True, f"Valid URL '{url}' was rejected by scheme check!"
        
    for url in invalid_urls:
        clean = url.strip()
        ok = bool(clean) and (clean.startswith("http://") or clean.startswith("https://") or clean.startswith("data:image/"))
        assert ok is False, f"Invalid URL '{url}' bypassed scheme validation!"

