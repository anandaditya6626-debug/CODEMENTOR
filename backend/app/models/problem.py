import uuid
from sqlalchemy import Column, String, Integer, Text, Boolean, JSON, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class Topic(Base):
    __tablename__ = "topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    display_order = Column(Integer, nullable=True)
    problem_count = Column(Integer, default=0)

    problems = relationship("Problem", secondary="problem_tags", back_populates="topics")


class Problem(Base):
    __tablename__ = "problems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String(10), nullable=False)
    examples = Column(JSON, nullable=True)
    constraints = Column(JSON, nullable=True)
    hints = Column(JSON, nullable=True)
    expected_time_complexity = Column(String(50), nullable=True)
    expected_space_complexity = Column(String(50), nullable=True)
    starter_code = Column(JSON, nullable=True)
    solution_code = Column(JSON, nullable=True)
    solution_explanation = Column(Text, nullable=True)
    pattern_tags = Column(ARRAY(String), nullable=True)
    is_active = Column(Boolean, default=True)
    is_daily = Column(Boolean, default=False)
    total_submissions = Column(Integer, default=0)
    accepted_submissions = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    topics = relationship("Topic", secondary="problem_tags", back_populates="problems")
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan")


class ProblemTag(Base):
    __tablename__ = "problem_tags"

    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), primary_key=True)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id"), primary_key=True)

ProblemTopic = ProblemTag


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=False)
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_hidden = Column(Boolean, default=False)
    is_sample = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)
    time_limit_ms = Column(Integer, default=5000)
    memory_limit_kb = Column(Integer, default=262144)

    problem = relationship("Problem", back_populates="test_cases")
