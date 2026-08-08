import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="User")  # User, Skincare Consultant, Dermatologist, Administrator
    created_at = Column(DateTime, default=datetime.utcnow)

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
    sleep_hours = Column(Float, default=7.5)
    water_intake_l = Column(Float, default=2.5)
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
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="routines")

class ProgressPhoto(Base):
    __tablename__ = "progress_photos"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    image_url = Column(String, nullable=False)
    skin_health_score = Column(Float, nullable=True)
    tag = Column(String, default="Baseline")  # Baseline, Week 2, Week 4, Week 8
    uploaded_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)

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
