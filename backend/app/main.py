import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base, SessionLocal, check_db_connection
from .models import (
    User, UserProfile, SystemConfig, ContentArticle, Ingredient, BackupRecord,
    ConsultantProfile, ConsultantNote, ConsultantFollowUp, ConsultantReminder,
    ProductRecommendation, TreatmentProtocol, SkinConcernGuide
)
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
    appointment_router,
    dermatologist_router
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

        # ── Seed Treatment Protocols ──────────────────────────────────────────
        treatment_protocols = [
            {
                "protocol_code": "PROT-ACNE-01",
                "name": "Targeted Acne & Dermal Barrier Repair Protocol",
                "category": "Acne & Blemish",
                "target_concerns": ["Acne", "Inflammation", "Clogged Pores"],
                "suitable_skin_types": ["Oily", "Combination", "Acne-Prone"],
                "severity_level": "Moderate",
                "duration_weeks": 8,
                "expected_outcome": "50-70% reduction in inflammatory comedones and papules within 6 weeks, with full barrier restoration and reduced sebum production.",
                "morning_protocol": [
                    {"step": 1, "category": "Cleansing", "instructions": "Gentle Salicylic Acid 0.5% foaming cleanser with lukewarm water"},
                    {"step": 2, "category": "Treatment", "instructions": "Niacinamide 5% + Zinc PCA 1% soothing hydration serum"},
                    {"step": 3, "category": "Moisturizing", "instructions": "Lightweight oil-free Ceramide gel hydrator"},
                    {"step": 4, "category": "Sun Protection", "instructions": "Broad Spectrum Mineral SPF 50 Non-Comedogenic Sunscreen"}
                ],
                "evening_protocol": [
                    {"step": 1, "category": "Cleansing", "instructions": "Double cleanse: Gentle Micellar water followed by hydrating cleanser"},
                    {"step": 2, "category": "Treatment", "instructions": "Azelaic Acid 10% topical cream on affected regions"},
                    {"step": 3, "category": "Moisturizing", "instructions": "Barrier lipid replenishing night cream with Centella Asiatica"}
                ],
                "recommended_actives": ["Niacinamide", "Salicylic Acid", "Zinc PCA", "Centella Asiatica (Cica)", "Azelaic Acid"],
                "contraindicated_actives": ["Heavy Mineral Oils", "High-concentration Benzoyl Peroxide with Retinol (same step)", "Physical walnut scrubs"],
                "precautions": "Introduce Azelaic Acid gradually (3x/week). Ensure daily broad-spectrum SPF 50 sunscreen use.",
                "derma_referral_triggers": "Nodulocystic acne, scarring cysts, failure to improve after 8 weeks, or signs of secondary bacterial infection."
            },
            {
                "protocol_code": "PROT-BARRIER-02",
                "name": "Intensive Lipid Barrier Restoration & Calm Protocol",
                "category": "Barrier Repair",
                "target_concerns": ["Barrier Damage", "Redness", "Stinging", "Dehydration"],
                "suitable_skin_types": ["Sensitive", "Dry", "Reactive", "Over-Exfoliated"],
                "severity_level": "Mild to Moderate",
                "duration_weeks": 4,
                "expected_outcome": "Restoration of natural stratum corneum integrity, cessation of stinging upon moisture application within 10-14 days.",
                "morning_protocol": [
                    {"step": 1, "category": "Cleansing", "instructions": "Rinse with lukewarm thermal water or gentle non-foaming cream wash"},
                    {"step": 2, "category": "Hydration", "instructions": "Multi-molecular Hyaluronic Acid + Panthenol 5% essence"},
                    {"step": 3, "category": "Moisturizing", "instructions": "Physiological 3:1:1 Ceramide, Cholesterol & Fatty Acid cream"},
                    {"step": 4, "category": "Sun Protection", "instructions": "Pure Zinc Oxide 100% physical mineral sunscreen SPF 50+"}
                ],
                "evening_protocol": [
                    {"step": 1, "category": "Cleansing", "instructions": "Ultra-gentle milk cleanser (sulfate-free, fragrance-free)"},
                    {"step": 2, "category": "Soothing", "instructions": "Madecassoside + Bisabolol barrier concentrate"},
                    {"step": 3, "category": "Occlusion", "instructions": "Rich soothing balm with Squalane and Oat Beta-Glucan"}
                ],
                "recommended_actives": ["Ceramides (NP, AP, EOP)", "Centella Asiatica", "Panthenol (Vitamin B5)", "Squalane", "Oat Beta-Glucan", "Bisabolol"],
                "contraindicated_actives": ["AHA / BHA / PHA Chemical Exfoliants", "L-Ascorbic Acid", "Retinoids", "Essential Oils", "Alcohol Denat"],
                "precautions": "Strictly suspend all chemical exfoliants and retinoids during the 4-week recovery phase.",
                "derma_referral_triggers": "Severe contact dermatitis, blistering, active eczema flares requiring topical corticosteroids."
            },
            {
                "protocol_code": "PROT-PIGMENT-03",
                "name": "Clinical Hyperpigmentation & Melanin Dispersal Protocol",
                "category": "Hyperpigmentation",
                "target_concerns": ["Dark Spots", "Post-Inflammatory Hyperpigmentation (PIH)", "Uneven Tone"],
                "suitable_skin_types": ["Combination", "Normal", "Oily", "Hyperpigmented"],
                "severity_level": "Moderate",
                "duration_weeks": 12,
                "expected_outcome": "Visible lightening of localized pigmentation clusters by 35-50% over 12 weeks of compliant treatment and strict UV shielding.",
                "morning_protocol": [
                    {"step": 1, "category": "Cleansing", "instructions": "Antioxidant balancing gel cleanser"},
                    {"step": 2, "category": "Antioxidant", "instructions": "10% Pure Vitamin C (Ascorbic Acid) + Ferulic Acid serum"},
                    {"step": 3, "category": "Moisturizing", "instructions": "Niacinamide 3% light emulsion"},
                    {"step": 4, "category": "Sun Protection", "instructions": "High UVA/UVB PA++++ Mineral + Tinted SPF 50 (blocks blue light)"}
                ],
                "evening_protocol": [
                    {"step": 1, "category": "Cleansing", "instructions": "Thorough gentle cleansing balm and foam wash"},
                    {"step": 2, "category": "Brightening Active", "instructions": "Tranexamic Acid 3% + Alpha Arbutin 2% treatment serum"},
                    {"step": 3, "category": "Repair", "instructions": "Licorice Root + Peptide renewal night cream"}
                ],
                "recommended_actives": ["Alpha Arbutin", "Tranexamic Acid", "Licorice Root Extract (Glabridin)", "Vitamin C", "Niacinamide", "Ferulic Acid"],
                "contraindicated_actives": ["Hydroquinone without dermatologist prescription", "Unbuffered glycolic acid peels at home"],
                "precautions": "Re-apply sunscreen every 2-3 hours during outdoor exposure. Tinted sunscreen protects against visible blue light pigment stimulation.",
                "derma_referral_triggers": "Dermal melasma, suspicious asymmetrical pigmented lesions, or resistance to 12 weeks of topical protocol."
            }
        ]
        for prot in treatment_protocols:
            existing_prot = db.query(TreatmentProtocol).filter(TreatmentProtocol.protocol_code == prot["protocol_code"]).first()
            if not existing_prot:
                db.add(TreatmentProtocol(**prot))
            else:
                for k, v in prot.items():
                    setattr(existing_prot, k, v)
        db.commit()

        # ── Seed Skin Concerns Guide ──────────────────────────────────────────
        skin_concerns_data = [
            {
                "name": "Acne & Inflammatory Comedones",
                "slug": "acne-inflammatory-comedones",
                "clinical_name": "Acne Vulgaris",
                "category": "Inflammatory",
                "description": "Multifactorial follicular disorder characterized by microcomedone formation, Cutibacterium acnes proliferation, follicular hyperkeratinization, and inflammatory cytokine cascades.",
                "common_characteristics": ["Open and closed comedones", "Erythematous papules and pustules", "Elevated sebum secretion rate", "Post-inflammatory hyperpigmentation"],
                "associated_skin_types": ["Oily", "Combination", "Hormonally Reactive"],
                "root_causes": ["Elevated androgen levels stimulating sebaceous hyperplasia", "Abnormal follicular desquamation causing follicular plugging", "Bacterial biofilm formation (C. acnes)", "High glycemic diet and chronic psychological stress"],
                "recommended_approaches": ["Topical keratolytics to normalize cellular desquamation", "Anti-inflammatory botanical agents to soothe cytokine storm", "Sebum-regulating actives without disrupting lipid mantle", "Strict non-comedogenic daily hydration"],
                "key_ingredients": ["Salicylic Acid (BHA 0.5-2%)", "Niacinamide (2-5%)", "Zinc PCA", "Azelaic Acid (10%)", "Centella Asiatica (Madecassoside)"],
                "ingredients_to_avoid": ["Isopropyl Myristate", "Coconut Oil / Sodium Lauryl Sulfate", "Heavy Petrolatum Occlusives on Active Papules", "High-concentration Essential Oils"],
                "suggested_products": ["BHA Clarifying Cleanser", "Niacinamide 10% + Zinc 1% Serum", "Cica Barrier Soothing Gel Cream", "Matte Fluid SPF 50"],
                "lifestyle_guidance": "Maintain consistent circadian sleep, minimize refined sugar intake, wash pillowcases bi-weekly, and avoid physical friction/touching of facial skin.",
                "warnings": "Do not combine high-strength Salicylic Acid and Retinol in the same morning/evening step to avoid barrier compromise.",
                "derma_referral_threshold": "Nodular or cystic acne (>5mm), scarring, lesions extending down the neck and jawline, or emotional distress."
            },
            {
                "name": "Compromised Dermal Barrier & Dehydration",
                "slug": "compromised-dermal-barrier",
                "clinical_name": "Stratum Corneum Barrier Dysfunction",
                "category": "Barrier & Hydration",
                "description": "Impaired lipid matrix in the stratum corneum leading to excessive Transepidermal Water Loss (TEWL), heightened allergen penetrance, and sensory neurogenic hyper-reactivity.",
                "common_characteristics": ["Persistent skin tightness after washing", "Stinging or burning with mild moisturizers", "Flaking, roughness, and fine dehydration lines", "Diffuse patchy erythema"],
                "associated_skin_types": ["Dry", "Sensitive", "Over-Processed", "All Skin Types in Winter"],
                "root_causes": ["Over-exfoliation with AHA/BHA or facial scrubs", "Harsh alkaline surfactants stripping natural intercellular lipids", "Environmental cold, low humidity, and indoor heating", "Chronic use of unbuffered retinoids without adequate lipid support"],
                "recommended_approaches": ["Immediate elimination of active acids and physical scrubs", "Replenishment of physiological 3:1:1 lipid ratio", "Multi-depth humectants coupled with biocompatible occlusives", "Non-stripping pH 5.5 cleansers"],
                "key_ingredients": ["Ceramide NP, AP, EOP", "Cholesterol & Free Fatty Acids", "Panthenol (Pro-Vitamin B5)", "Squalane", "Oat Beta-Glucan", "Centella Asiatica"],
                "ingredients_to_avoid": ["Glycolic Acid", "Salicylic Acid", "Pure Retinol", "Alcohol Denat", "Synthetic Fragrances & Limonene"],
                "suggested_products": ["Lipid Barrier Replenishing Cream", "Panthenol 5% B5 Hydrating Essence", "Oat Calming Cleansing Balm", "100% Plant Squalane Oil"],
                "lifestyle_guidance": "Use a room humidifier, limit hot showers to under 5 minutes, and apply hydrators onto damp skin.",
                "warnings": "Do not attempt to 'scrub off' flaking skin as this further removes defensive corneocyte layers.",
                "derma_referral_threshold": "Secondary bacterial crusting (impetigo), weeping lesions, or severe eczema/dermatitis unresponsive to 2 weeks of barrier therapy."
            },
            {
                "name": "Post-Inflammatory Hyperpigmentation (PIH)",
                "slug": "post-inflammatory-hyperpigmentation",
                "clinical_name": "Post-Inflammatory Melanosis",
                "category": "Pigmentary",
                "description": "Acquired hypermelanosis following cutaneous injury or inflammatory dermatoses, characterized by epidermal melanin accumulation and/or dermal melanophage deposition.",
                "common_characteristics": ["Flat localized dark brown, red, or purple macules", "Coincides with sites of resolved acne or eczema", "Slow spontaneous resolution over months", "Aggravated by UV and visible sunlight"],
                "associated_skin_types": ["Fitzpatrick Skin Types III-VI", "Acne-Prone", "Post-Procedure Skin"],
                "root_causes": ["Prostaglandins, leukotrienes, and cytokines triggering melanocyte hyper-reactivity", "Sunlight stimulating further tyrosinase activity on damaged sites", "Manual extraction and picking of acne lesions"],
                "recommended_approaches": ["Tyrosinase enzyme inhibition", "Melanosome transfer blockage from melanocytes to keratinocytes", "Accelerated epidermal cell renewal via gentle non-irritating actives", "Daily broad-spectrum high UVA/UVB and blue light protection"],
                "key_ingredients": ["Tranexamic Acid (3-5%)", "Alpha Arbutin (2%)", "Ascorbyl Glucoside / Vitamin C", "Niacinamide (5%)", "Licorice Extract (Glabridin)"],
                "ingredients_to_avoid": ["Excessive friction", "Aggressive chemical peels without photoprotection", "Comedogenic carrier oils"],
                "suggested_products": ["Tranexamic + Arbutin Brightening Serum", "10% Vitamin C + Ferulic Acid Antioxidant Day Serum", "Tinted Mineral SPF 50"],
                "lifestyle_guidance": "Strict daily sun protection is 80% of PIH resolution. Wear wide-brim hats during peak solar hours.",
                "warnings": "Avoid rapid aggressive brightening products that cause inflammation, which will paradoxically worsen PIH.",
                "derma_referral_threshold": "Dermal melanophage deposition refractory to 6 months of topical care, or melasma requiring prescription triple combination therapy."
            },
            {
                "name": "Facial Erythema & Microvascular Reactivity",
                "slug": "facial-erythema-reactivity",
                "clinical_name": "Erythematotelangiectatic Reactivity",
                "category": "Vascular",
                "description": "Neurovascular dysregulation leading to transient flushing, persistent central facial erythema, and increased sensitivity to thermal, spicy, and emotional stimuli.",
                "common_characteristics": ["Central facial flushing (cheeks, nose, forehead)", "Visible telangiectasias (spider veins)", "Stinging sensation upon temperature change", "Skin reactivity to topical cosmetics"],
                "associated_skin_types": ["Fair Skin Types (Fitzpatrick I-II)", "Sensitive", "Thin/Reactive Skin"],
                "root_causes": ["Upregulation of transient receptor potential (TRP) channels in sensory nerves", "Microvascular hyper-reactivity and endothelial permeability", "Demodex folliculorum mite proliferation trigger", "Alcohol, hot beverages, spicy foods, and temperature swings"],
                "recommended_approaches": ["Anti-inflammatory topical vasoconstrictive/calming agents", "Microbiome balance support", "Physical mineral-only sunscreen filters", "Strict elimination of known dietary/environmental vasodilators"],
                "key_ingredients": ["Azelaic Acid (10%)", "Centella Asiatica (Asiaticoside)", "Green Tea Polyphenols (EGCG)", "Bisabolol", "Niacinamide (low dose 2%)", "Zinc Oxide"],
                "ingredients_to_avoid": ["Menthol, Camphor & Peppermint", "High-strength Glycolic Acid", "Alcohol-based astringents", "Physical scrub beads"],
                "suggested_products": ["Azelaic Calming 10% Suspension", "Cica Redness Relief Treatment Gel", "Mineral Tinted Soothing Sunscreen SPF 50"],
                "lifestyle_guidance": "Avoid boiling hot beverages and saunas, moderate spicy food intake, and protect face from winter wind with scarves.",
                "warnings": "Never apply topical steroids without strict dermatologist supervision as it can trigger steroid-induced rebound rosacea.",
                "derma_referral_threshold": "Ocular symptoms (dry, gritty eyes), severe papulopustular flares, or persistent rhinophyma changes."
            }
        ]
        for c in skin_concerns_data:
            existing_c = db.query(SkinConcernGuide).filter(SkinConcernGuide.slug == c["slug"]).first()
            if not existing_c:
                db.add(SkinConcernGuide(**c))
            else:
                for k, v in c.items():
                    setattr(existing_c, k, v)
        db.commit()

        # ── Seed Consultant Profile & Sample Data for Priya & Riya ────────────
        consultants = db.query(User).filter(User.role == "Skincare Consultant").all()
        for c_user in consultants:
            c_prof = db.query(ConsultantProfile).filter(ConsultantProfile.user_id == c_user.id).first()
            if not c_prof:
                db.add(ConsultantProfile(
                    user_id=c_user.id,
                    phone="+91 98765 43210",
                    title="Senior Clinical Skincare Consultant",
                    specialization="Acne Barrier Repair & Botanical Science",
                    experience_years=8,
                    bio="Dedicated clinical aesthetician and skincare consultant with over 8 years of specialized practice in lipid barrier repair, chronic acne comedolysis, and evidence-based botanical active delivery.",
                    qualifications="B.Sc. Cosmetic Science & Dermatology Aesthetics (Gold Medalist)",
                    availability="Mon - Sat · 9:30 AM - 6:30 PM IST",
                ))
                db.commit()

        # Seed sample client notes, followups, reminders, recommendations if empty
        if db.query(ConsultantNote).count() == 0 and consultants:
            sample_client = db.query(User).filter(User.role == "User").first()
            if sample_client:
                c_id = consultants[0].id
                # Notes
                db.add(ConsultantNote(
                    consultant_id=c_id,
                    client_id=sample_client.id,
                    client_name=sample_client.name,
                    title="Initial Barrier & Acne Evaluation",
                    content="Client presents with compromised lipid barrier following intensive OTC scrub use. Prescribed gentle Cica gel cleanser + 5% Niacinamide serum. Advised strict cessation of physical exfoliants.",
                    category="Routine Review",
                    tag="Barrier Health",
                    is_pinned=True
                ))
                db.add(ConsultantNote(
                    consultant_id=c_id,
                    client_id=sample_client.id,
                    client_name=sample_client.name,
                    title="Week 2 Tolerance Check-In",
                    content="Client reports redness reduced significantly. Zero stinging on sunscreen application. Progressing to low-dose Azelaic Acid 10% on PM routine 3x weekly.",
                    category="Progress Note",
                    tag="Acne Protocol",
                    is_pinned=False
                ))
                # Follow-ups
                db.add(ConsultantFollowUp(
                    consultant_id=c_id,
                    client_id=sample_client.id,
                    client_name=sample_client.name,
                    due_date="2026-08-25",
                    due_time="11:30 AM",
                    topic="4-Week Dermal Barrier & Comedone Audit",
                    action_items="Evaluate skin hydration subscore, inspect progress photos, adjust PM active frequency.",
                    status="Upcoming"
                ))
                db.add(ConsultantFollowUp(
                    consultant_id=c_id,
                    client_id=sample_client.id,
                    client_name=sample_client.name,
                    due_date="2026-08-12",
                    due_time="10:00 AM",
                    topic="Introductory Skincare Habit Consultation",
                    action_items="Completed baseline assessment review and established hydration goals.",
                    status="Completed",
                    outcome_notes="Client successfully onboarded and initiated customized routine."
                ))
                # Reminders
                db.add(ConsultantReminder(
                    consultant_id=c_id,
                    client_id=sample_client.id,
                    client_name=sample_client.name,
                    title="Review Routine Compliance Log for Ananya",
                    description="Check if PM barrier repair serum was applied consistently over past 7 days.",
                    due_date="2026-08-20",
                    priority="High",
                    category="Routine Review",
                    is_completed=False
                ))
                db.add(ConsultantReminder(
                    consultant_id=c_id,
                    client_id=sample_client.id,
                    client_name=sample_client.name,
                    title="Send Progress Photo Upload Notification",
                    description="Request 4-week milestone progress selfie in natural indirect daylight.",
                    due_date="2026-08-24",
                    priority="Medium",
                    category="Follow-up",
                    is_completed=False
                ))
                # Product Recommendations
                sample_prod = db.query(Product).first()
                if sample_prod:
                    db.add(ProductRecommendation(
                        consultant_id=c_id,
                        client_id=sample_client.id,
                        client_name=sample_client.name,
                        product_id=sample_prod.id,
                        product_name=sample_prod.product_name,
                        brand=sample_prod.brand,
                        category=sample_prod.category,
                        target_concern="Barrier Repair & Acne Management",
                        usage_instructions="Apply 2 pumps evenly over face and neck every morning after gentle cleansing.",
                        time_of_day="AM",
                        why_recommended="Formulated with physiological ceramides and niacinamide to accelerate stratum corneum healing.",
                        price=sample_prod.price,
                        image_url=sample_prod.image_url
                    ))
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

        logger.info("Demo content seeded: SystemConfig, ContentArticles, Ingredients, Protocols, SkinConcerns, ConsultantData, BackupRecord")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app_: FastAPI):
    """FastAPI lifespan handler: runs startup logic before the app accepts requests."""
    try:
        _seed_demo_users()
        _seed_demo_content()
    except Exception as e:
        logger.error(f"Startup seeding error (non-fatal): {e}", exc_info=True)
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
app.include_router(dermatologist_router.router)

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
