import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # nullable for social-only accounts
    name = Column(String, nullable=False)
    role = Column(String, default="User")  # User, Skincare Consultant, Dermatologist, Administrator
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Social OAuth fields
    social_provider = Column(String, nullable=True)   # 'google' | 'twitter' | 'facebook' | 'instagram'
    social_id = Column(String, nullable=True, index=True)  # provider's unique user id
    avatar_url = Column(String, nullable=True)         # profile picture from provider

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    assessments = relationship("SkinAssessment", back_populates="user")
    routines = relationship("SkincareRoutine", back_populates="user")
    photos = relationship("ProgressPhoto", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    skin_type = Column(String, nullable=True)  # Oily, Dry, Combination, Sensitive
    concerns = Column(JSON, default=list)      # ["Acne", "Dark Spots"]
    allergies = Column(JSON, default=list)     # ["Parabens", "Fragrance"]
    sensitivities = Column(String, nullable=True)

    # Lifestyle Metrics
    sleep_hours = Column(Float, nullable=True)
    water_intake_l = Column(Float, nullable=True)
    stress_level = Column(Integer, default=4)
    sun_exposure = Column(String, default="Moderate")

    user = relationship("User", back_populates="profile")

class SkinAssessment(Base):
    __tablename__ = "skin_assessments"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    overall_score = Column(Float, nullable=False)
    condition_subscore = Column(Float, nullable=False)
    lifestyle_subscore = Column(Float, nullable=False)
    sleep_subscore = Column(Float, nullable=False)
    consistency_subscore = Column(Float, nullable=False)
    hydration_subscore = Column(Float, nullable=False)
    detected_concerns = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="assessments")

class SkincareRoutine(Base):
    __tablename__ = "skincare_routines"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    assessment_id = Column(String, ForeignKey("skin_assessments.id"), nullable=True)
    time_of_day = Column(String, nullable=False)  # AM, PM, Weekly
    step_number = Column(Integer, nullable=False)
    step_category = Column(String, nullable=False)  # Cleansing, Exfoliation, Treatment, Moisturizing, Sun Protection
    product_name = Column(String, nullable=False)
    active_ingredients = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    prescribed_by_doctor = Column(Boolean, default=False)
    doctor_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="routines")

class ProgressPhoto(Base):
    __tablename__ = "progress_photos"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    image_url = Column(String, nullable=False)
    skin_health_score = Column(Float, nullable=True)
    tag = Column(String, default="Baseline")  # Baseline, Week 2, Week 4, Week 8
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="photos")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    consultant_id = Column(String, nullable=True)
    dermatologist_id = Column(String, nullable=True)
    target_role = Column(String, default="Consultant")  # Consultant, Dermatologist
    preferred_date = Column(String, nullable=False)     # YYYY-MM-DD
    preferred_time = Column(String, nullable=False)     # e.g. 10:30 AM
    status = Column(String, default="Requested")        # Requested, Accepted, Rejected, Referred_To_Dermatologist, Completed
    user_notes = Column(Text, nullable=True)
    consultant_summary = Column(Text, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_name = Column(String, index=True, nullable=False)
    brand = Column(String, index=True, nullable=True)
    usage_type = Column(String, index=True, nullable=True)
    category = Column(String, index=True, nullable=True)
    ingredients = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    product_url = Column(String, nullable=True)
    price = Column(Float, nullable=True)   # NULL = not available in SkinSAFE dataset
    safety_score = Column(Float, default=90.0)
    rating = Column(Float, default=4.6)


# ── Admin & System Models ─────────────────────────────────────────────────────

class Ingredient(Base):
    """Skincare ingredient knowledge base for admin management."""
    __tablename__ = "ingredients"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True, nullable=False)
    category = Column(String, nullable=True)        # Humectant, Emollient, Active, Exfoliant, Preservative
    function = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    benefits = Column(JSON, default=list)           # list of benefit strings
    concerns = Column(JSON, default=list)           # potential side effects / concerns
    skin_types = Column(JSON, default=list)         # suitable skin types
    avoid_with = Column(JSON, default=list)         # ingredient conflicts
    safety_rating = Column(String, default="Safe")  # Safe, Moderate, Caution
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ContentArticle(Base):
    """CMS content articles managed by admin."""
    __tablename__ = "content_articles"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    category = Column(String, nullable=True)        # Skincare Guide, Research, FAQ, Announcement
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="Draft")        # Draft, Published, Archived
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    published_at = Column(DateTime, nullable=True)


class SystemNotification(Base):
    """Platform-wide admin-created system notifications."""
    __tablename__ = "system_notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="System")  # System, Appointment, Assessment, Product, Security, Announcement
    audience = Column(String, default="All")              # All, User, Skincare Consultant, Dermatologist, Administrator
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    """Immutable trail of administrative actions on the platform."""
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    user_name = Column(String, nullable=True)       # denormalized for log readability
    user_role = Column(String, nullable=True)
    action = Column(String, nullable=False)         # USER_CREATED, ROLE_CHANGED, PRODUCT_DELETED, etc.
    resource_type = Column(String, nullable=True)   # User, Product, Ingredient, Content, etc.
    resource_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)           # additional metadata dict
    status = Column(String, default="Success")      # Success, Failure
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SystemConfig(Base):
    """Key-value platform configuration editable by admin."""
    __tablename__ = "system_config"

    id = Column(String, primary_key=True, default=generate_uuid)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    category = Column(String, default="General")   # General, Assessment, Notifications, Security, Platform
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class BackupRecord(Base):
    """Records of database backup operations."""
    __tablename__ = "backup_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    status = Column(String, default="Pending")      # Pending, Running, Completed, Failed
    backup_type = Column(String, default="Manual")  # Manual, Automatic
    notes = Column(Text, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


# ── Consultant Domain Models ───────────────────────────────────────────────────

class ConsultantProfile(Base):
    """Rich professional profile for Skincare Consultants."""
    __tablename__ = "consultant_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    phone = Column(String, nullable=True)
    title = Column(String, default="Senior Skincare Consultant")
    specialization = Column(String, default="Acne Barrier Repair & Botanical Science")
    experience_years = Column(Integer, default=8)
    bio = Column(Text, nullable=True)
    areas_of_expertise = Column(JSON, default=lambda: ["Acne & Blemish Care", "Barrier Restoration", "Hyperpigmentation", "Sensitive Skin Protocols"])
    skin_concerns_handled = Column(JSON, default=lambda: ["Acne", "Hyperpigmentation", "Dryness & Dehydration", "Redness & Sensitivity", "Premature Aging"])
    skin_types_handled = Column(JSON, default=lambda: ["Oily", "Combination", "Dry", "Sensitive", "Normal"])
    certifications = Column(JSON, default=lambda: ["Certified Aesthetic Skincare Specialist (CASS)", "Advanced Dermal Barrier Science Diploma", "Clinical Botanical Formulations Certificate"])
    qualifications = Column(String, default="B.Sc. Cosmetic Science & Dermatology Aesthetics")
    availability = Column(String, default="Mon-Fri, 9:00 AM - 6:00 PM IST")
    consultation_modes = Column(JSON, default=lambda: ["Video Consultation", "Chat & Follow-up Review", "Clinical Routine Audit"])
    joined_date = Column(String, default="2022-03-15")
    account_status = Column(String, default="Active · Verified Professional")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ConsultantNote(Base):
    """Consultant clinical & client interaction notes."""
    __tablename__ = "consultant_notes"

    id = Column(String, primary_key=True, default=generate_uuid)
    consultant_id = Column(String, ForeignKey("users.id"), nullable=False)
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    client_name = Column(String, nullable=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, default="General Consultation")  # General Consultation, Routine Review, Allergy Alert, Progress Note, Barrier Check
    tag = Column(String, default="Routine")
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ConsultantFollowUp(Base):
    """Scheduled client follow-up interactions."""
    __tablename__ = "consultant_followups"

    id = Column(String, primary_key=True, default=generate_uuid)
    consultant_id = Column(String, ForeignKey("users.id"), nullable=False)
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    client_name = Column(String, nullable=True)
    due_date = Column(String, nullable=False)   # YYYY-MM-DD
    due_time = Column(String, default="11:00 AM")
    topic = Column(String, nullable=False)
    action_items = Column(Text, nullable=True)
    status = Column(String, default="Upcoming")  # Upcoming, Completed, Overdue, Cancelled
    outcome_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ConsultantReminder(Base):
    """Clinical reminders and tasks for consultants."""
    __tablename__ = "consultant_reminders"

    id = Column(String, primary_key=True, default=generate_uuid)
    consultant_id = Column(String, ForeignKey("users.id"), nullable=False)
    client_id = Column(String, ForeignKey("users.id"), nullable=True)
    client_name = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(String, nullable=False)   # YYYY-MM-DD
    priority = Column(String, default="Medium") # High, Medium, Low
    category = Column(String, default="Follow-up") # Follow-up, Routine Review, Appointment, Product Check, General
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ProductRecommendation(Base):
    """Products recommended to clients by consultants."""
    __tablename__ = "product_recommendations"

    id = Column(String, primary_key=True, default=generate_uuid)
    consultant_id = Column(String, ForeignKey("users.id"), nullable=False)
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    client_name = Column(String, nullable=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    product_name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    category = Column(String, nullable=True)
    target_concern = Column(String, nullable=True)
    usage_instructions = Column(Text, nullable=True)  # e.g. "Apply 3-4 drops in PM routine after cleansing"
    time_of_day = Column(String, default="PM")        # AM, PM, Both
    why_recommended = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TreatmentProtocol(Base):
    """Structured clinical treatment reference protocols."""
    __tablename__ = "treatment_protocols"

    id = Column(String, primary_key=True, default=generate_uuid)
    protocol_code = Column(String, unique=True, index=True, nullable=False) # e.g. "PROT-ACNE-01"
    name = Column(String, nullable=False)
    category = Column(String, nullable=False) # Acne & Blemish, Barrier Repair, Hyperpigmentation, Anti-Aging, Rosacea & Redness
    target_concerns = Column(JSON, default=list)
    suitable_skin_types = Column(JSON, default=list)
    severity_level = Column(String, default="Mild to Moderate") # Mild, Moderate, Severe
    duration_weeks = Column(Integer, default=6)
    expected_outcome = Column(Text, nullable=True)
    morning_protocol = Column(JSON, default=list)  # list of step dicts
    evening_protocol = Column(JSON, default=list)  # list of step dicts
    recommended_actives = Column(JSON, default=list)
    contraindicated_actives = Column(JSON, default=list)
    precautions = Column(Text, nullable=True)
    derma_referral_triggers = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SkinConcernGuide(Base):
    """Clinical skin concerns knowledge guide for consultants."""
    __tablename__ = "skin_concerns_guide"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    clinical_name = Column(String, nullable=True)
    category = Column(String, nullable=False) # Inflammatory, Pigmentary, Barrier & Hydration, Structural & Aging, Vascular
    description = Column(Text, nullable=False)
    common_characteristics = Column(JSON, default=list)
    associated_skin_types = Column(JSON, default=list)
    root_causes = Column(JSON, default=list)
    recommended_approaches = Column(JSON, default=list)
    key_ingredients = Column(JSON, default=list)
    ingredients_to_avoid = Column(JSON, default=list)
    suggested_products = Column(JSON, default=list)
    lifestyle_guidance = Column(Text, nullable=True)
    warnings = Column(Text, nullable=True)
    derma_referral_threshold = Column(Text, nullable=True)
    derma_referral_triggers = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Dermatologist Domain Models ───────────────────────────────────────────────

class DermatologistProfile(Base):
    """Rich professional profile for Medical Dermatologists."""
    __tablename__ = "dermatologist_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    phone = Column(String, nullable=True)
    title = Column(String, default="Senior Consultant Dermatologist")
    specialization = Column(String, default="Clinical & Procedural Dermatology")
    license_number = Column(String, default="MCI-DERM-48921-IN")
    clinic_hospital_affiliation = Column(String, default="Miracle Advanced Skin & Laser Institute")
    experience_years = Column(Integer, default=12)
    bio = Column(Text, nullable=True)
    areas_of_expertise = Column(JSON, default=lambda: ["Acne Vulgaris & Cystic Acne", "Melasma & Pigmentary Disorders", "Atopic Dermatitis & Psoriasis", "Laser & Procedural Aesthetics", "Barrier Repair Therapies"])
    clinical_interests = Column(JSON, default=lambda: ["Topical Retinoid Formulations", "Transepidermal Water Loss Dynamics", "Microbiome Modulation", "Post-Inflammatory Erythema"])
    certifications = Column(JSON, default=lambda: ["Board Certified Dermatologist (IADVL)", "Fellowship in Aesthetic Dermatology (FAAD)", "Diplomate in Clinical Dermatology (UK)"])
    qualifications = Column(String, default="M.D. Dermatology, Venereology & Leprosy (Gold Medalist)")
    consultation_fee = Column(Float, default=1500.0)
    availability = Column(String, default="Mon-Sat, 10:00 AM - 7:00 PM IST")
    clinical_modes = Column(JSON, default=lambda: ["In-Clinic Examination", "Tele-Dermatology Video Audit", "Emergency Clinical Review"])
    joined_date = Column(String, default="2021-06-10")
    account_status = Column(String, default="Verified Medical Practitioner · Active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DermaTreatmentPlan(Base):
    """Structured medical treatment plans created by dermatologists."""
    __tablename__ = "derma_treatment_plans"

    id = Column(String, primary_key=True, default=generate_uuid)
    dermatologist_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_name = Column(String, nullable=True)
    title = Column(String, nullable=False)
    diagnosis = Column(String, nullable=False)
    severity = Column(String, default="Moderate")  # Mild, Moderate, Severe, Refractory
    objectives = Column(Text, nullable=False)
    recommended_actives = Column(JSON, default=list)
    frequency = Column(String, default="Daily - Morning & Evening")
    duration_weeks = Column(Integer, default=8)
    start_date = Column(String, nullable=False)    # YYYY-MM-DD
    end_date = Column(String, nullable=False)      # YYYY-MM-DD
    instructions = Column(Text, nullable=True)
    status = Column(String, default="Active")      # Active, Completed, Paused, Discontinued
    progress_percentage = Column(Integer, default=0)
    clinical_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DermaPrescription(Base):
    """High-potency Rx prescriptions issued by dermatologists."""
    __tablename__ = "derma_prescriptions"

    id = Column(String, primary_key=True, default=generate_uuid)
    prescription_code = Column(String, unique=True, index=True, nullable=False)  # e.g. "RX-2026-9812"
    dermatologist_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_name = Column(String, nullable=True)
    medication_name = Column(String, nullable=False)  # e.g. "Tretinoin 0.05% Microsphere Gel"
    dosage = Column(String, nullable=False)           # e.g. "Pea-sized amount (0.5g)"
    frequency = Column(String, default="Every alternate evening")
    duration = Column(String, default="12 Weeks")
    start_date = Column(String, nullable=False)       # YYYY-MM-DD
    end_date = Column(String, nullable=False)         # YYYY-MM-DD
    refills_allowed = Column(Integer, default=2)
    instructions = Column(Text, nullable=True)
    warnings = Column(Text, nullable=True)            # e.g. "Strict sunscreen mandatory. Avoid during pregnancy."
    status = Column(String, default="Active")         # Active, Completed, Cancelled
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DermaClinicalInsight(Base):
    """AI-powered clinical intelligence & risk analysis records."""
    __tablename__ = "derma_clinical_insights"

    id = Column(String, primary_key=True, default=generate_uuid)
    dermatologist_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_name = Column(String, nullable=True)
    skin_concern = Column(String, nullable=False)
    risk_level = Column(String, default="Moderate")   # Low, Moderate, High, Critical
    confidence_score = Column(Float, default=88.5)
    primary_finding = Column(Text, nullable=False)
    ai_risk_indicators = Column(JSON, default=list)   # list of risk indicators
    concerning_patterns = Column(JSON, default=list)  # list of concerning trends
    recommended_interventions = Column(JSON, default=list)
    barrier_stress_index = Column(Float, default=42.0)
    requires_attention = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DermaClinicalReport(Base):
    """Formal medical dossiers & analytical reports."""
    __tablename__ = "derma_clinical_reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    report_code = Column(String, unique=True, index=True, nullable=False)  # e.g. "RPT-DERMA-892"
    dermatologist_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_name = Column(String, nullable=True)
    report_type = Column(String, default="Comprehensive Clinical Evaluation")
    diagnosis_summary = Column(Text, nullable=False)
    baseline_score = Column(Float, default=62.0)
    current_score = Column(Float, default=82.0)
    improvement_rate = Column(Float, default=32.2)
    barrier_recovery_pct = Column(Float, default=88.5)
    regimen_compliance_pct = Column(Float, default=94.0)
    doctor_conclusions = Column(Text, nullable=False)
    next_audit_date = Column(String, default="2026-09-15")
    status = Column(String, default="Finalized")  # Draft, Finalized, Archived
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DermaResearchPublication(Base):
    """Peer-reviewed clinical literature & dermatology research papers."""
    __tablename__ = "derma_research_publications"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    authors = Column(String, nullable=False)
    journal = Column(String, nullable=False)
    publication_year = Column(Integer, default=2026)
    category = Column(String, nullable=False)       # Retinoids & Actives, Barrier Repair, Pigmentary Disorders, Acne Pathology, Laser Aesthetics
    doi_or_url = Column(String, nullable=True)
    abstract = Column(Text, nullable=False)
    clinical_takeaways = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


