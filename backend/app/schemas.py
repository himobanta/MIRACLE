from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "User"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str

class UserProfileSchema(BaseModel):
    age: Optional[int] = 25
    gender: Optional[str] = "Female"
    skin_type: str = "Oily"
    concerns: List[str] = []
    allergies: List[str] = []
    sensitivities: Optional[str] = "None"
    sleep_hours: float = 7.5
    water_intake_l: float = 2.5
    stress_level: int = 4
    sun_exposure: str = "Moderate"

class AssessmentRequest(BaseModel):
    skin_type: str
    acne_severity: int = 0
    hyperpigmentation_severity: int = 0
    redness_severity: int = 0
    wrinkles_severity: int = 0
    allergies: List[str] = []
    lifestyle: Dict[str, Any] = {}

class AssessmentResponse(BaseModel):
    id: str
    overall_score: float
    condition_subscore: float
    lifestyle_subscore: float
    sleep_subscore: float
    consistency_subscore: float
    hydration_subscore: float
    detected_concerns: List[str]
    created_at: Optional[str] = None

class RoutineStepSchema(BaseModel):
    id: Optional[str] = None
    time_of_day: str
    step_number: int
    step_category: str
    product_name: str
    active_ingredients: List[str] = []
    is_active: bool = True
    prescribed_by_doctor: bool = False
    doctor_notes: Optional[str] = None

class IngredientEvaluationRequest(BaseModel):
    product_name: str
    ingredients: List[str]
    user_allergies: List[str] = []
    routine_time: str = "PM"

class RecommendationQuery(BaseModel):
    skin_type: str
    concerns: List[str]
    allergies: List[str] = []
    max_budget: Optional[float] = None

class PrescribeRoutineRequest(BaseModel):
    patient_id: str
    doctor_notes: str
    routine_steps: List[RoutineStepSchema]
