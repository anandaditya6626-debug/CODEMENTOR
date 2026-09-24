import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, Float, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Contest(Base):
    __tablename__ = 'contests'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    difficulty = Column(String(20))  # easy, medium, hard, mixed
    max_participants = Column(Integer, default=1000)
    problem_ids = Column(JSON)  # list of problem IDs
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ContestParticipation(Base):
    __tablename__ = 'contest_participations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contest_id = Column(UUID(as_uuid=True), ForeignKey('contests.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    score = Column(Integer, default=0)
    problems_solved = Column(Integer, default=0)
    total_time_seconds = Column(Integer, default=0)
    rank = Column(Integer)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('contest_id', 'user_id'),)


class InterviewSession(Base):
    __tablename__ = 'interview_sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    session_type = Column(String(50), nullable=False)  # 'dsa', 'system_design', 'behavioral'
    difficulty = Column(String(20), nullable=False)  # easy, medium, hard
    company_style = Column(String(50))  # google, meta, amazon, general
    problem_id = Column(UUID(as_uuid=True), ForeignKey('problems.id'), nullable=True)
    status = Column(String(30), default='in_progress')  # in_progress, completed, abandoned
    conversation = Column(JSON, default=[])  # list of {role, content, timestamp}
    final_feedback = Column(Text)
    score = Column(Integer)  # 0-100
    duration_seconds = Column(Integer)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
