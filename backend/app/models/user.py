import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    profile = relationship("Profile", back_populates="user", uselist=False)


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    preparing_for = Column(ARRAY(String), nullable=True)
    skill_level = Column(String(20), nullable=True)
    preferred_languages = Column(ARRAY(String), nullable=True)
    daily_target_minutes = Column(Integer, default=30)
    problems_solved = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    total_time_spent_minutes = Column(Integer, default=0)
    accuracy_percentage = Column(Float, default=0.0)
    learning_progress = Column(Float, default=0.0)
    last_active_date = Column(Date, nullable=True)
    is_public = Column(Boolean, default=True)
    show_on_leaderboard = Column(Boolean, default=True)

    user = relationship("User", back_populates="profile")
