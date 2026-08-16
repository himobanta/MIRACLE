import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base, SessionLocal, check_db_connection
from .models import User, UserProfile, SystemConfig, ContentArticle, Ingredient, BackupRecord
from .auth import hash_password
from .config import CORS_ORIGINS_RAW, ENVIRONMENT, log_startup_summary
from .routers import (
    auth_router,
    assessment_router,
    routine_router,
    ingredient_router,
    recommendation_router,
    analytics_router,
    consultant_router,
    appointment_router
)
from .routers import admin_router
from .routers import admin_extended_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("miracle.app")

# Create database tables (idempotent — safe for both SQLite and PostgreSQL)
Base.metadata.create_all(bind=engine)


def _seed_demo_users():
    """Seed demo accounts if they don't already exist.
    Safe to run in any environment — idempotent (creates only if missing).

    Demo credentials:
      user@miracle.com         / password123   (User)
      consultant@miracle.com   / password123   (Skincare Consultant)
      dermatologist@miracle.com/ password123   (Dermatologist)
      admin@miracle.com        / password123   (Administrator)
      derma@miracle.com        / doctor123     (Dermatologist — legacy alias)
    """
    log_startup_summary()
    logger.info(f"Environment: {ENVIRONMENT} — seeding demo accounts if missing...")
    db = SessionLocal()
    try:
        # ── Demo User ─────────────────────────────────────────────────────────
        if not db.query(User).filter(User.email == "user@miracle.com").first():
            user = User(
                name="Ananya Sharma",
                email="user@miracle.com",
                hashed_password=hash_password("password123"),
                role="User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            profile = UserProfile(
                user_id=user.id,
                skin_type="Oily",
                concerns=["Acne", "Pigmentation"]
            )
            db.add(profile)
            db.commit()
            logger.info("Seeded demo User: user@miracle.com")

        # ── Demo Skincare Consultant ───────────────────────────────────────────
        if not db.query(User).filter(User.email == "consultant@miracle.com").first():
            consultant = User(
                name="Priya Sharma",
                email="consultant@miracle.com",
                hashed_password=hash_password("password123"),
                role="Skincare Consultant"
            )
            db.add(consultant)
            db.commit()
            db.refresh(consultant)
            profile = UserProfile(user_id=consultant.id)
            db.add(profile)
            db.commit()
            logger.info("Seeded demo Skincare Consultant: consultant@miracle.com")

        # ── Demo Dermatologist (canonical) ────────────────────────────────────
        if not db.query(User).filter(User.email == "dermatologist@miracle.com").first():
            dermatologist = User(
                name="Dr. Kavita Nair",
                email="dermatologist@miracle.com",
                hashed_password=hash_password("password123"),
                role="Dermatologist"
            )
            db.add(dermatologist)
            db.commit()
            db.refresh(dermatologist)
            profile = UserProfile(user_id=dermatologist.id)
            db.add(profile)
            db.commit()
            logger.info("Seeded demo Dermatologist: dermatologist@miracle.com")

        # ── Demo Administrator ────────────────────────────────────────────────
        existing_admin = db.query(User).filter(User.email == "admin@miracle.com").first()
        if not existing_admin:
            admin = User(
                name="Himobanta Dutta",
                email="admin@miracle.com",
                hashed_password=hash_password("password123"),
                role="Administrator"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            profile = UserProfile(user_id=admin.id)
            db.add(profile)
            db.commit()
            logger.info("Seeded demo Administrator: admin@miracle.com (Himobanta Dutta)")
        else:
            if existing_admin.name != "Himobanta Dutta":
                existing_admin.name = "Himobanta Dutta"
                db.commit()
                logger.info("Updated demo Administrator name to: Himobanta Dutta")

        # ── Legacy Dermatologist alias (backward compatibility) ───────────────
        if not db.query(User).filter(User.email == "derma@miracle.com").first():
            doctor = User(
                name="Dr. Meera Vasudevan",
                email="derma@miracle.com",
                hashed_password=hash_password("doctor123"),
                role="Dermatologist"
            )
            db.add(doctor)
            db.commit()
            logger.info("Seeded legacy Dermatologist alias: derma@miracle.com")

        # ── Second Skincare Consultant ─────────────────────────────────────────
        if not db.query(User).filter(User.email == "consultant2@miracle.com").first():
            consultant2 = User(
                name="Riya Banerjee",
                email="consultant2@miracle.com",
                hashed_password=hash_password("Miracle@2024"),
                role="Skincare Consultant"
            )
            db.add(consultant2)
            db.commit()
            db.refresh(consultant2)
            profile2 = UserProfile(user_id=consultant2.id)
            db.add(profile2)
            db.commit()
            logger.info("Seeded second Skincare Consultant: consultant2@miracle.com")
    finally:
        db.close()


def _seed_demo_content():
    """Seed default system settings, sample content articles, ingredients, and a backup record.
    Idempotent — only inserts missing records.
    """
    db = SessionLocal()
    try:
        # ── 5 Default SystemConfig records ────────────────────────────────────
        default_configs = [
            {
                "key": "platform_name",
                "value": "MIRACLE",
                "category": "Platform",
                "description": "Display name of the platform",
            },
            {
                "key": "registration_enabled",
                "value": "true",
                "category": "Security",
                "description": "Allow new user self-registration",
            },
            {
                "key": "max_daily_assessments",
                "value": "10",
                "category": "Assessment",
                "description": "Maximum skin assessments a user can submit per day",
            },
            {
                "key": "session_timeout_hours",
                "value": "168",
                "category": "Security",
                "description": "JWT access token lifetime in hours (7 days default)",
            },
            {
                "key": "maintenance_mode",
                "value": "false",
                "category": "Platform",
                "description": "When true, non-admin users receive a maintenance notice",
            },
        ]
        for cfg in default_configs:
            if not db.query(SystemConfig).filter(SystemConfig.key == cfg["key"]).first():
                db.add(SystemConfig(**cfg))
        db.commit()

        # ── 3 Sample ContentArticle records ───────────────────────────────────
        sample_articles = [
            {
                "title": "The Complete Guide to Building a Skincare Routine",
                "body": "Building an effective skincare routine starts with understanding your skin type.",
                "category": "Skincare Guide",
                "status": "Published",
                "tags": ["beginner", "routine", "skincare"],
            },
            {
                "title": "Understanding Skin Types: Oily, Dry, Combination & Sensitive",
                "body": "Knowing your skin type is the foundation of any effective skincare regimen.",
                "category": "Research",
                "status": "Published",
                "tags": ["skin-type", "oily", "dry", "combination"],
            },
            {
                "title": "FAQ: Common Skincare Myths Debunked",
                "body": "From sunscreen myths to the truth about natural ingredients — we clear it all up.",
                "category": "FAQ",
                "status": "Published",
                "tags": ["faq", "myths", "sunscreen"],
            },
        ]
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for art in sample_articles:
            if not db.query(ContentArticle).filter(ContentArticle.title == art["title"]).first():
                db.add(ContentArticle(
                    title=art["title"],
                    body=art["body"],
                    category=art["category"],
                    status=art["status"],
                    tags=art["tags"],
                    published_at=now,
                ))
        db.commit()

        # ── 15 Comprehensive Ingredient records ───────────────────────────────
        sample_ingredients = [
            {
                "name": "Niacinamide (Vitamin B3)",
                "category": "Active",
                "function": "Barrier Support, Pore Minimizing, Sebum Regulation",
                "description": "A versatile water-soluble vitamin that strengthens skin ceramides, fades post-inflammatory hyperpigmentation, and balances oil production.",
                "benefits": ["Refines enlarged pores", "Fades dark spots", "Boosts ceramide synthesis", "Calms redness and inflammation"],
                "concerns": ["Mild flushing at high concentrations (>10%)"],
                "skin_types": ["Oily", "Combination", "Dry", "Sensitive", "Acne-Prone"],
                "avoid_with": ["High-potency L-Ascorbic Acid (layer separately)"],
                "safety_rating": "Safe",
            },
            {
                "name": "Salicylic Acid (BHA)",
                "category": "Exfoliant",
                "function": "Deep Pore Cleansing, Keratolytic, Anti-Acne",
                "description": "Lipid-soluble beta-hydroxy acid that penetrates into sebaceous follicles to dissolve trapped oil and dead skin cells.",
                "benefits": ["Eliminates blackheads & whiteheads", "Reduces acne breakouts", "Exfoliates pore linings", "Controls excess oil"],
                "concerns": ["Can cause dryness or peeling if overused", "Increases sun sensitivity"],
                "skin_types": ["Oily", "Acne-Prone", "Combination"],
                "avoid_with": ["Strong Retinoids (same routine)", "High-strength AHA peels"],
                "safety_rating": "Safe",
            },
            {
                "name": "Hyaluronic Acid (Multi-Molecular)",
                "category": "Humectant",
                "function": "Deep Hydration, Trans-Epidermal Water Binding",
                "description": "Powerful humectant capable of binding up to 1,000 times its weight in water, drawing moisture deep into the epidermis.",
                "benefits": ["Deep epidermal hydration", "Plumps fine dehydration lines", "Restores skin elasticity", "Accelerates barrier healing"],
                "concerns": ["May draw moisture out of skin in extremely dry climates if not sealed with an occlusive"],
                "skin_types": ["All Skin Types", "Dry", "Dehydrated", "Sensitive"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Retinol (Vitamin A)",
                "category": "Active",
                "function": "Cell Turnover Acceleration, Collagen Synthesis, Anti-Aging",
                "description": "The gold standard dermatological anti-aging active that stimulates fibroblasts to produce collagen and accelerates cellular renewal.",
                "benefits": ["Smooths fine lines and wrinkles", "Fades stubborn hyperpigmentation", "Improves skin density", "Prevents micro-comedone formation"],
                "concerns": ["Purging and dryness during retinization phase", "Contraindicated during pregnancy/nursing", "High photosensitivity"],
                "skin_types": ["Normal", "Aging", "Acne-Prone", "Tolerant"],
                "avoid_with": ["Direct Acids (AHA/BHA)", "Benzoyl Peroxide", "Pure Vitamin C"],
                "safety_rating": "Moderate",
            },
            {
                "name": "Ceramides (NP, AP, EOP)",
                "category": "Emollient",
                "function": "Lipid Matrix Restoration, Barrier Repair, TEWL Prevention",
                "description": "Essential skin-identical lipids comprising ~50% of the skin barrier that lock in vital hydration and protect against environmental pollutants.",
                "benefits": ["Repairs damaged skin barrier", "Relieves chronic dryness & eczema", "Prevents trans-epidermal water loss", "Soothes stinging and irritation"],
                "concerns": [],
                "skin_types": ["Dry", "Sensitive", "Compromised Barrier", "Post-Procedure"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "L-Ascorbic Acid (Vitamin C)",
                "category": "Active",
                "function": "Antioxidant Defense, Photoprotection, Collagen Induction",
                "description": "Potent pure antioxidant that neutralizes free radicals generated by UV and pollution while inhibiting tyrosinase to brighten skin tone.",
                "benefits": ["Brightens uneven skin tone", "Stimulates collagen production", "Boosts sunscreen photoprotection", "Fades stubborn dark spots"],
                "concerns": ["Can oxidize rapidly if exposed to light/air", "May tingle on sensitive or broken skin"],
                "skin_types": ["Normal", "Dull", "Hyperpigmented", "Aging"],
                "avoid_with": ["Retinol (same routine)", "Copper Peptides", "Niacinamide at high concentrations"],
                "safety_rating": "Safe",
            },
            {
                "name": "Centella Asiatica (Cica / Madecassoside)",
                "category": "Botanical",
                "function": "Anti-Inflammatory, Wound Healing, Soothing",
                "description": "Traditional medicinal herb packed with madecassic acid and asiaticoside that rapidly calms redness, repair micro-tears, and soothes irritation.",
                "benefits": ["Soothes acute redness and irritation", "Promotes micro-wound healing", "Reinforces compromised barriers", "Anti-inflammatory action"],
                "concerns": [],
                "skin_types": ["Sensitive", "Reactive", "Acne-Prone", "Rosacea-Prone"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Glycolic Acid (AHA)",
                "category": "Exfoliant",
                "function": "Superficial Exfoliation, Cell Renewal, Texture Smoothing",
                "description": "Smallest molecular weight alpha-hydroxy acid that penetrates skin efficiently to dissolve dead cellular bonds on the surface.",
                "benefits": ["Restores luminous skin radiance", "Smooths rough bumpy skin texture", "Fades superficial dark marks", "Increases product absorption"],
                "concerns": ["Can cause stinging or chemical burn if overapplied", "Significant photosensitivity (SPF required)"],
                "skin_types": ["Normal", "Dull", "Sun-Damaged", "Dry"],
                "avoid_with": ["Retinoids", "Other strong chemical exfoliants"],
                "safety_rating": "Moderate",
            },
            {
                "name": "Azelaic Acid (10-20%)",
                "category": "Active",
                "function": "Anti-Bacterial, Redness Reduction, Hyperpigmentation Eraser",
                "description": "Dermatologist-beloved dicarboxylic acid that selectively targets hyperactive melanocytes while reducing Cutibacterium acnes bacteria.",
                "benefits": ["Calms rosacea and facial redness", "Treats inflammatory acne", "Fades melasma and post-acne erythema", "Gentle exfoliation"],
                "concerns": ["Mild tingling sensation for the first 1-2 weeks of use"],
                "skin_types": ["Acne-Prone", "Rosacea-Prone", "Hyperpigmented", "Sensitive"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Squalane (100% Plant-Derived)",
                "category": "Emollient",
                "function": "Weightless Moisture Sealing, Non-Comedogenic Hydration",
                "description": "Biocompatible hydrogenated form of skin-natural squalene that provides silky, non-greasy lipid replenishment without clogging pores.",
                "benefits": ["Locks in hydration weightlessly", "Softens and balances rough texture", "Non-comedogenic", "Supports lipid barrier resilience"],
                "concerns": [],
                "skin_types": ["All Skin Types", "Oily", "Sensitive", "Acne-Prone"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Zinc PCA",
                "category": "Active",
                "function": "Sebum Control, Antimicrobial, Anti-Inflammatory",
                "description": "Physiological trace mineral zinc paired with L-pyrrolidone carboxylic acid that regulates 5-alpha reductase to control sebum output.",
                "benefits": ["Suppresses excessive sebum production", "Inhibits acne-causing bacteria", "Soothes inflammation", "Matte finish support"],
                "concerns": [],
                "skin_types": ["Oily", "Blemish-Prone", "Combination"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Panthenol (Pro-Vitamin B5)",
                "category": "Humectant",
                "function": "Deep Hydration, Barrier Soothing, Anti-Itch",
                "description": "Precursor to vitamin B5 that penetrates deeply to deliver moisture, stimulate epithelialization, and relieve itching or irritation.",
                "benefits": ["Soothes itching and irritation", "Deep epidermal hydration", "Accelerates skin tissue repair", "Enhances barrier elasticity"],
                "concerns": [],
                "skin_types": ["Sensitive", "Compromised", "Dry", "Post-Laser / Post-Peel"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Peptides (Matrixyl 3000 & Copper Tripeptide-1)",
                "category": "Active",
                "function": "Collagen Signal Peptides, Skin Firming, Elasticity Recovery",
                "description": "Amino acid chains that act as cellular messengers signaling fibroblasts to synthesize new collagen, elastin, and glycosaminoglycans.",
                "benefits": ["Improves skin firmness and bounce", "Reduces wrinkle depth", "Supports cellular wound repair", "Enhances dermal matrix"],
                "concerns": [],
                "skin_types": ["Aging", "Loss of Firmness", "Mature", "Preventative"],
                "avoid_with": ["Direct Acids (AHA/BHA) when using Copper Peptides", "Pure Vitamin C (L-Ascorbic Acid)"],
                "safety_rating": "Safe",
            },
            {
                "name": "Zinc Oxide & Titanium Dioxide (Mineral UV Filters)",
                "category": "Active",
                "function": "Broad-Spectrum Physical UV Defense, Calming",
                "description": "Inert physical mineral sunscreen filters that sit on the skin surface to reflect and scatter UVA and UVB radiation without chemical absorption.",
                "benefits": ["UVA/UVB Broad Spectrum photoprotection", "Immediate protection upon application", "Safe for ultra-sensitive & post-procedure skin", "Anti-inflammatory zinc benefits"],
                "concerns": ["May leave a subtle white cast on deeper skin tones if non-nano/un-tinted"],
                "skin_types": ["Sensitive", "Post-Treatment", "Rosacea-Prone", "Children / Pregnancy"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Tranexamic Acid (2-5%)",
                "category": "Active",
                "function": "Melasma Control, UV-Induced Pigmentation Blocker",
                "description": "Synthetic derivative of lysine that inhibits plasmin and melanocyte-stimulating hormone pathway to halt UV-induced pigment formation.",
                "benefits": ["Fades stubborn melasma and sun spots", "Blocks UV-triggered pigmentation pathways", "Calms post-inflammatory hyperpigmentation", "Synergizes with Niacinamide"],
                "concerns": [],
                "skin_types": ["Hyperpigmented", "Melasma-Prone", "Sun-Damaged"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Bakuchiol (Natural Retinol Alternative)",
                "category": "Active",
                "function": "Cell Turnover, Collagen Support, Antioxidant",
                "description": "Plant-derived meroterpene from Psoralea corylifolia seeds that delivers retinol-like collagen stimulation without skin irritation or photosensitivity.",
                "benefits": ["Stimulates type I, III, and IV collagen", "Fades hyperpigmentation & fine lines", "Safe for daytime use & pregnancy", "Potent antioxidant defense"],
                "concerns": [],
                "skin_types": ["Sensitive", "Aging", "Pregnancy-Safe", "All Skin Types"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Alpha Arbutin (Pure Biosynthetic 2%)",
                "category": "Active",
                "function": "Tyrosinase Inhibitor, Spot Brightening",
                "description": "Biosynthetic hydroquinone-glucoside derivative that competitively inhibits tyrosinase activity to fade dark spots.",
                "benefits": ["Fades post-inflammatory hyperpigmentation", "Reduces UV-induced sun spots", "Evens patchy skin tone", "Gentler alternative to kojic acid"],
                "concerns": [],
                "skin_types": ["Hyperpigmented", "Melasma-Prone", "Dull", "All Skin Types"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Madecassoside (Purified Centella Isolate)",
                "category": "Botanical",
                "function": "Barrier Reconstruction, Anti-Redness, Collagen Synthesis",
                "description": "Highly purified bioactive pentacyclic triterpene isolated from Centella Asiatica that accelerates collagen III synthesis.",
                "benefits": ["Accelerates re-epithelialization after peels", "Calms acute facial erythema", "Stimulates dermal extracellular matrix", "Relieves burning sensation"],
                "concerns": [],
                "skin_types": ["Compromised", "Post-Procedure", "Sensitive", "Rosacea-Prone"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Mandelic Acid (AHA 10%)",
                "category": "Exfoliant",
                "function": "Gentle Surface Exfoliation, Antibacterial, Melanin Regulation",
                "description": "Large molecular weight aromatic alpha-hydroxy acid derived from bitter almonds that penetrates slowly, making it safe for melanated skin.",
                "benefits": ["Superficial dead cell sloughing without stinging", "Inhibits acne-causing bacteria", "Refines rough textural irregularities", "Safe for Fitzpatrick IV-VI"],
                "concerns": ["Mild photosensitivity (sun protection required)"],
                "skin_types": ["Sensitive", "Melanated", "Acne-Prone", "Beginners"],
                "avoid_with": ["Strong Retinoids (concurrent application)"],
                "safety_rating": "Safe",
            },
            {
                "name": "Lactic Acid (AHA 5-10%)",
                "category": "Exfoliant",
                "function": "Hydrating Exfoliation, NMF Supplementation",
                "description": "Naturally occurring alpha-hydroxy acid that dissolves desmosomes while acting as a natural moisturizing factor (NMF) humectant.",
                "benefits": ["Smooths texture while boosting moisture", "Improves skin brightness and tone", "Stimulates ceramide production in epidermis", "Gentler than Glycolic Acid"],
                "concerns": ["Photosensitivity"],
                "skin_types": ["Dry", "Normal", "Dull", "Sensitive"],
                "avoid_with": ["Strong prescription retinoids in same step"],
                "safety_rating": "Safe",
            },
            {
                "name": "Polyhydroxy Acid (Gluconolactone & Lactobionic Acid)",
                "category": "Exfoliant",
                "function": "Micro-Exfoliation, Water Binding, Barrier Defense",
                "description": "Next-generation large-molecule exfoliants that provide gentle surface renewal while offering strong antioxidant photoprotection and intense hydration.",
                "benefits": ["Exfoliates without compromising skin barrier", "Humectant properties draw water deep into stratum corneum", "Antioxidant chelating effect", "Safe for rosacea and eczema"],
                "concerns": [],
                "skin_types": ["Ultra-Sensitive", "Eczema-Prone", "Dry", "Mature"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Colloidal Oatmeal (USP Grade)",
                "category": "Botanical",
                "function": "Anti-Itch, Barrier Coating, Eczema Relief",
                "description": "Finely ground Avena sativa whole oat grain rich in beta-glucans, avenanthramides, and lipids that form a protective hydrocolloid barrier.",
                "benefits": ["FDA-recognized skin protectant", "Instantly soothes itching and burning", "Reduces erythema and skin roughness", "Restores microbiome balance"],
                "concerns": [],
                "skin_types": ["Eczema-Prone", "Compromised", "Sensitive", "Dry"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Ectoin (Natural Extremolyte 2%)",
                "category": "Active",
                "function": "Cellular Stress Protection, Blue Light Defense, Hydration Shield",
                "description": "Natural amino acid derivative synthesized by extremophilic bacteria that binds water molecules to form protective hydration complexes around cellular membranes.",
                "benefits": ["Shields cells from pollution and HEV blue light", "Long-lasting cellular hydration", "Prevents UV-induced skin damage", "Reduces transepidermal water loss"],
                "concerns": [],
                "skin_types": ["All Skin Types", "Urban/Pollution-Exposed", "Aging", "Sensitive"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Green Tea Polyphenols (EGCG 90%)",
                "category": "Botanical",
                "function": "Free Radical Scavenger, Anti-Angiogenic, Calming",
                "description": "Concentrated Epigallocatechin Gallate from Camellia sinensis that neutralizes reactive oxygen species and suppresses sebaceous gland activity.",
                "benefits": ["Neutralizes oxidative stress", "Reduces sebum secretion rate", "Calms facial redness and capillary flush", "Photoprotective antioxidant support"],
                "concerns": [],
                "skin_types": ["Oily", "Acne-Prone", "Rosacea-Prone", "All Skin Types"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Allantoin (Pure Crystalline)",
                "category": "Humectant",
                "function": "Keratolytic Softening, Epithelial Repair, Calming",
                "description": "Skin-active soothing compound that promotes desquamation of upper stratum corneum layers while stimulating cell proliferation.",
                "benefits": ["Softens rough, flaky skin", "Promotes micro-fissure healing", "Protects against irritants", "Enhances skin smoothness"],
                "concerns": [],
                "skin_types": ["Sensitive", "Dry", "Chapped", "Post-Treatment"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Beta-Glucan (Oat & Yeast Derived)",
                "category": "Humectant",
                "function": "Deep Hydration, Barrier Regeneration, Immune Support",
                "description": "Natural polysaccharide with 20% higher water-holding capacity than hyaluronic acid that activates macrophage immunity in the skin.",
                "benefits": ["Superior water retention compared to standard humectants", "Boosts skin immune defense mechanisms", "Smooths skin roughness", "Soothes post-procedure irritation"],
                "concerns": [],
                "skin_types": ["Dehydrated", "Compromised", "Aging", "Sensitive"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Kojic Acid (Pure Dipalmitate 1-2%)",
                "category": "Active",
                "function": "Chelating Tyrosinase Inhibitor, Melasma Fading",
                "description": "Natural fungal metabolite produced during Aspergillus fermentation that chelates copper in the tyrosinase active site to stop melanin synthesis.",
                "benefits": ["Fades persistent sun and age spots", "Lightens melasma patches", "Prevents post-breakout dark marks", "Synergistic with vitamin C"],
                "concerns": ["May cause contact dermatitis in sensitive individuals at >2%"],
                "skin_types": ["Hyperpigmented", "Sun-Damaged", "Dull"],
                "avoid_with": ["High-strength chemical peels concurrently"],
                "safety_rating": "Moderate",
            },
            {
                "name": "Coenzyme Q10 (Ubiquinone)",
                "category": "Active",
                "function": "Mitochondrial Energy, Lipid Antioxidant, Anti-Aging",
                "description": "Vital lipid-soluble coenzyme naturally present in skin cells that supports mitochondrial ATP synthesis and protects skin lipids against oxidative peroxides.",
                "benefits": ["Energizes cellular metabolism and repair", "Protects lipid membranes against lipid peroxidation", "Reduces depth of photodamage wrinkles", "Enhances firmness"],
                "concerns": [],
                "skin_types": ["Aging", "Dull", "Fatigued", "Normal"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Licorice Root Extract (Glabridin 40%)",
                "category": "Botanical",
                "function": "Discoloration Dispersal, Redness Relief, Anti-Inflammatory",
                "description": "Potent phyto-active from Glycyrrhiza glabra containing glabridin and liquiritin that disperses existing melanin clusters and inhibits erythema.",
                "benefits": ["Fades hyperpigmentation safely without cytotoxicity", "Calms facial redness and rosacea flare-ups", "Natural skin brightening support", "Antioxidant protection"],
                "concerns": [],
                "skin_types": ["Hyperpigmented", "Sensitive", "Rosacea-Prone", "Dull"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Resveratrol (Pure 99% Trans-Resveratrol)",
                "category": "Active",
                "function": "Sirtuin Activation, Cellular Longevity, Free Radical Defense",
                "description": "Polyphenolic phytoalexin that activates SIRT1 longevity enzymes in fibroblasts and neutralizes reactive nitrogen and oxygen species at night.",
                "benefits": ["Boosts endogenous cellular antioxidant defenses", "Supports nighttime dermal regeneration", "Improves skin firmness and density", "Soothes persistent redness"],
                "concerns": [],
                "skin_types": ["Aging", "Sun-Damaged", "Stressed", "All Skin Types"],
                "avoid_with": ["High-strength oxidizers"],
                "safety_rating": "Safe",
            },
            {
                "name": "Ferulic Acid (Plant-Derived Antioxidant)",
                "category": "Active",
                "function": "Antioxidant Stabilization, UV Protection Multiplier",
                "description": "Plant cell-wall phenolic antioxidant that doubles the photoprotective efficacy of Vitamin C and Vitamin E while preventing chemical oxidation.",
                "benefits": ["Stabilizes Vitamin C and E formulations", "Multiplies environmental UV/pollution defense", "Fights solar photo-aging", "Fades discolorations"],
                "concerns": [],
                "skin_types": ["Normal", "Aging", "Dull", "Hyperpigmented"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Sodium PCA (Natural Moisturizing Factor)",
                "category": "Humectant",
                "function": "Physiological Hydration, Stratum Corneum Conditioning",
                "description": "Naturally occurring amino acid derivative constituting ~12% of human natural moisturizing factor (NMF) that binds water tightly to corneocytes.",
                "benefits": ["Restores natural cellular hydration levels", "Improves skin softness and bounce", "Non-comedogenic and biomimetic", "Prevents dehydration tightness"],
                "concerns": [],
                "skin_types": ["All Skin Types", "Dehydrated", "Dry", "Oily-Dehydrated"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Bisabolol (Pure Bio-Alpha Bisabolol)",
                "category": "Botanical",
                "function": "Anti-Inflammatory, Penetration Enhancer, Soothing",
                "description": "Primary active constituent of German Chamomile (Matricaria recutita) that downregulates pro-inflammatory prostaglandins.",
                "benefits": ["Immediate soothing of stinging and redness", "Assists deeper delivery of complementary actives", "Natural antimicrobial properties", "Safe for sensitive skin"],
                "concerns": [],
                "skin_types": ["Sensitive", "Reactive", "Post-Treatment", "Dry"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
            {
                "name": "Tocopherol & Tocopheryl Acetate (Vitamin E)",
                "category": "Emollient",
                "function": "Lipid Soluble Antioxidant, Membrane Protection",
                "description": "Essential fat-soluble antioxidant that inserts into cellular lipid bilayers to prevent lipid peroxidation caused by sunlight and smog.",
                "benefits": ["Nourishes lipid barrier", "Protects against UV-induced erythema and lipid damage", "Enhances moisture retention", "Works synergistically with Vitamin C"],
                "concerns": ["Heavy pure Vitamin E oil may be comedogenic for acne-prone skin"],
                "skin_types": ["Dry", "Aging", "Normal", "Sun-Exposed"],
                "avoid_with": [],
                "safety_rating": "Safe",
            },
        ]
        for ing in sample_ingredients:
            existing_ing = db.query(Ingredient).filter(Ingredient.name == ing["name"]).first()
            if not existing_ing:
                db.add(Ingredient(**ing))
            else:
                for k, v in ing.items():
                    setattr(existing_ing, k, v)
        db.commit()

        # ── 1 Sample BackupRecord ─────────────────────────────────────────────
        if db.query(BackupRecord).count() == 0:
            db.add(BackupRecord(
                status="Completed",
                backup_type="Automatic",
                notes="Initial system backup at platform launch",
                size_bytes=1024 * 512,  # 512 KB placeholder
                completed_at=now,
            ))
            db.commit()

        logger.info("Demo content seeded: SystemConfig, ContentArticles, Ingredients, BackupRecord")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app_: FastAPI):
    """FastAPI lifespan handler: runs startup logic before the app accepts requests."""
    _seed_demo_users()
    _seed_demo_content()
    yield
    # Shutdown: no cleanup required for SQLAlchemy connection pool disposal


app = FastAPI(
    title="Miracle AI Skincare Intelligence & Planner API",
    description="Full-Stack Backend Engine for Skin Assessment, Scoring, Routine Generation, Product Recommendation, and Doctor Portals",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

allowed_origins = list(default_origins)

if CORS_ORIGINS_RAW.strip():
    parsed_origins = [
        origin.strip().rstrip("/")
        for origin in CORS_ORIGINS_RAW.split(",")
        if origin.strip()
    ]
    for origin in parsed_origins:
        if origin and origin not in allowed_origins:
            allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global production-safe exception handler ──────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler: never expose tracebacks, paths, DB URLs, or stack traces in production.
    """
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {type(exc).__name__}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(assessment_router.router)
app.include_router(routine_router.router)
app.include_router(ingredient_router.router)
app.include_router(recommendation_router.router)
app.include_router(analytics_router.router)
app.include_router(consultant_router.router)
app.include_router(appointment_router.router)
app.include_router(admin_router.router)
app.include_router(admin_extended_router.router)

# ── Health & Readiness Endpoints ──────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe: returns 200 when the application is alive."""
    return {"status": "ok", "service": "miracle-api"}

@app.get("/ready", tags=["Health"])
def readiness_check():
    """
    Readiness probe: verifies database connectivity.
    Returns 200 if ready, 503 if database is unreachable.
    Never exposes connection strings or credentials.
    """
    db_ok = check_db_connection()
    if db_ok:
        return {"status": "ready", "database": "connected"}
    return JSONResponse(
        status_code=503,
        content={"status": "not ready", "database": "unreachable"}
    )

# ── Static SPA Mount & Fallback Routing ────────────────────────────────────────
# Try multiple possible dist/ locations to cover Railway's deployment layout
_this_file = os.path.abspath(__file__)  # e.g. /app/backend/app/main.py
_app_root = os.path.dirname(os.path.dirname(os.path.dirname(_this_file)))  # /app

_candidate_dirs = [
    os.path.join(_app_root, "dist"),                                   # /app/dist (from 3 dirs up __file__)
    os.path.join(os.path.dirname(_this_file), "..", "..", "dist"),     # relative from backend/app
    os.path.join(os.path.dirname(_this_file), "..", "dist"),           # /app/app/dist
    os.path.join(os.getcwd(), "dist"),                                  # cwd/dist
    os.path.join(os.getcwd(), "app", "dist"),                          # /app/app/dist
    os.path.join(os.path.dirname(os.getcwd()), "dist"),                # parent of cwd / dist
    "/app/dist",                                                        # Railway absolute
    "/app/app/dist",                                                    # Railway nested app/dist
    "/dist",                                                            # fallback root
]

DIST_DIR = None
for _candidate in _candidate_dirs:
    _normalized = os.path.normpath(_candidate)
    if os.path.isdir(_normalized) and os.path.isfile(os.path.join(_normalized, "index.html")):
        DIST_DIR = _normalized
        logger.info(f"SPA dist/ found at: {DIST_DIR}")
        break

if not DIST_DIR:
    logger.warning(f"SPA dist/ NOT found. Checked: {[os.path.normpath(c) for c in _candidate_dirs]}")

if DIST_DIR:
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_or_fallback(full_path: str):
        # Don't intercept API routes or docs
        if full_path.startswith("api/") or full_path in ["docs", "openapi.json", "redoc", "debug-paths"]:
            return JSONResponse(status_code=404, content={"detail": "Not Found"})

        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)

        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)

        return JSONResponse(status_code=404, content={"detail": "SPA index.html not found"})

# Debug endpoint — always registered regardless of dist/ presence
@app.get("/debug-paths", tags=["Debug"], include_in_schema=False)
def debug_paths():
    """Diagnose static file path resolution on Railway dynamically."""
    live_this_file = os.path.abspath(__file__)
    live_app_root = os.path.dirname(os.path.dirname(os.path.dirname(live_this_file)))
    
    live_candidates = [
        os.path.join(live_app_root, "dist"),
        os.path.join(os.path.dirname(live_this_file), "..", "..", "dist"),
        os.path.join(os.getcwd(), "dist"),
        os.path.join(os.path.dirname(os.getcwd()), "dist"),
        "/app/dist",
        "/dist",
        "/app/backend/dist",
    ]
    
    app_dir_contents = []
    try:
        if os.path.isdir("/app"):
            app_dir_contents = os.listdir("/app")
    except Exception as e:
        app_dir_contents = [str(e)]
        
    cwd_contents = []
    try:
        cwd_contents = os.listdir(os.getcwd())
    except Exception as e:
        cwd_contents = [str(e)]

    return {
        "cwd": os.getcwd(),
        "cwd_contents": cwd_contents[:20],
        "app_dir_contents": app_dir_contents[:20],
        "this_file": live_this_file,
        "app_root": live_app_root,
        "dist_dir_used": DIST_DIR,
        "live_candidates_checked": {os.path.normpath(c): os.path.isdir(os.path.normpath(c)) for c in live_candidates},
        "dist_index_exists": DIST_DIR is not None and os.path.isfile(os.path.join(DIST_DIR, "index.html")),
    }

if not DIST_DIR:
    @app.get("/")
    def root():
        return {
            "status": "online",
            "service": "Miracle AI Skincare Intelligence Platform API",
            "version": "1.0.0",
            "documentation": "/docs"
        }
