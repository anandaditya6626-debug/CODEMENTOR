from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import date
import uuid
from app.schemas.auth import UserResponse

class ProfileBase(BaseModel):
    bio: Optional[str] = None
    preferred_languages: Optional[List[str]] = None
    daily_target_minutes: int = 30
    is_public: bool = True
    show_on_leaderboard: bool = True

class ProfileUpdateRequest(ProfileBase):
    pass

class OnboardingRequest(BaseModel):
    preparing_for: Optional[List[str]] = None
    skill_level: Optional[str] = None
    preferred_languages: Optional[List[str]] = None
    daily_target_minutes: int = 30

class ProfileResponse(ProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    preparing_for: Optional[List[str]] = None
    skill_level: Optional[str] = None
    problems_solved: int
    current_streak: int
    longest_streak: int
    total_time_spent_minutes: int
    accuracy_percentage: float
    learning_progress: float
    last_active_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)

class UserStatsResponse(BaseModel):
    problems_solved: int
    current_streak: int
    longest_streak: int = 0
    accuracy_percentage: float
    learning_progress: float
    problems_attempted: int = 0
    total_time_spent_minutes: int = 0

    model_config = ConfigDict(from_attributes=True)
