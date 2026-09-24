import uuid
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=False)
    code = Column(Text, nullable=False)
    language = Column(String(20), nullable=False)
    status = Column(String(30), nullable=True)
    is_run = Column(Boolean, default=False)
    runtime_ms = Column(Integer, nullable=True)
    memory_kb = Column(Integer, nullable=True)
    total_test_cases = Column(Integer, default=0)
    passed_test_cases = Column(Integer, default=0)
    compiler_output = Column(Text, nullable=True)
    error_output = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    results = relationship("SubmissionResult", back_populates="submission", cascade="all, delete-orphan")


class SubmissionResult(Base):
    __tablename__ = "submission_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False)
    test_case_id = Column(UUID(as_uuid=True), ForeignKey("test_cases.id"), nullable=False)
    status = Column(String(30), nullable=True)
    actual_output = Column(Text, nullable=True)
    runtime_ms = Column(Integer, nullable=True)
    memory_kb = Column(Integer, nullable=True)
    error_output = Column(Text, nullable=True)

    submission = relationship("Submission", back_populates="results")
