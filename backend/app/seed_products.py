import glob
import pandas as pd
import zlib
from sqlalchemy.orm import Session
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import Product

# Price pools for sensible Indian skincare retail pricing (INR ₹)
PREMIUM_TIER = [799, 899, 999, 1099, 1199, 1299, 1499, 1699, 1899, 1999, 2199, 2499, 2999]
MID_HIGH_TIER = [449, 499, 549, 599, 649, 699, 749, 799, 849, 899, 949, 999]
MID_TIER = [299, 329, 349, 379, 399, 429, 449, 479, 499, 529, 549, 599]
ENTRY_TIER = [149, 169, 179, 199, 219, 229, 249, 279, 299, 319, 349]

def get_deterministic_price(p_name: str, brand: str, category: str, usage_type: str) -> float:
    c_lower = category.lower()
    u_lower = usage_type.lower()
    b_lower = brand.lower()

    # Determine price tier based on product classification
    if any(k in c_lower or k in u_lower for k in ['retinol', 'anti-aging', 'peel', 'serum', 'complex', 'firming', 'microdermabrasion', 'lash', 'rx']):
        pool = PREMIUM_TIER
    elif any(k in b_lower for k in ['chanel', 'sk-ii', 'dermalogica', 'la roche-posay', 'neocutis', 'estee lauder', 'clinique', 'zo skin']):
        pool = PREMIUM_TIER
    elif any(k in c_lower or k in u_lower for k in ['moisturizer', 'sunscreen', 'eye', 'night', 'cream', 'treatment', 'acid', 'dark spot', 'emulsion']):
        pool = MID_HIGH_TIER
    elif any(k in c_lower or k in u_lower for k in ['cleanser', 'wash', 'toner', 'exfoliator', 'scrub', 'mask', 'mist', 'essence', 'micellar']):
        pool = MID_TIER
    else:
        pool = ENTRY_TIER

    # Hash product details for deterministic, permanent price assignment
    hash_key = f"{p_name}_{brand}_{category}_{usage_type}".encode('utf-8')
    hash_val = zlib.crc32(hash_key)
    return float(pool[hash_val % len(pool)])

def seed_products_from_csv():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    csv_files = glob.glob("products/SkinSAFE/*.csv")
    print(f"Found {len(csv_files)} CSV files in products/SkinSAFE/...")

    # Drop existing products to replace with persistent non-null pricing dataset
    db.query(Product).delete()
    db.commit()

    total_imported = 0
    batch = []

    for file_path in csv_files:
        df = pd.read_csv(file_path)
        
        for _, row in df.iterrows():
            p_name = str(row.get("product_name", "")).strip()
            if not p_name or p_name.lower() == "nan":
                continue

            brand = str(row.get("brand", "")) if pd.notna(row.get("brand")) else "Generic"
            usage_type = str(row.get("usage_type", "")) if pd.notna(row.get("usage_type")) else "Skin Care"
            category = str(row.get("category", "")) if pd.notna(row.get("category")) else "General"
            ingredients = str(row.get("ingredients", "")) if pd.notna(row.get("ingredients")) else ""
            image_url = str(row.get("image_url", "")) if pd.notna(row.get("image_url")) else ""
            product_url = str(row.get("product_url", "")) if pd.notna(row.get("product_url")) else ""

            if not image_url or image_url.lower() == "nan":
                image_url = "/assets/default_product.png"

            price = get_deterministic_price(p_name, brand, category, usage_type)

            product = Product(
                product_name=p_name,
                brand=brand,
                usage_type=usage_type,
                category=category,
                ingredients=ingredients,
                image_url=image_url,
                product_url=product_url,
                price=price,
                safety_score=92.0,
                rating=4.7
            )
            batch.append(product)
            total_imported += 1

            if len(batch) >= 3000:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []

    if batch:
        db.bulk_save_objects(batch)
        db.commit()

    db.close()
    print(f"FINISHED SEEDING: {total_imported} products with deterministic persistent INR prices successfully imported!")

if __name__ == "__main__":
    seed_products_from_csv()
