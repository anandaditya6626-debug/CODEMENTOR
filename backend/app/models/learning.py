import uuid
from sqlalchemy import Column, String, Integer, Text, Boolean, Float, DateTime, Date, ForeignKey, JSON, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class UserTopicProgress(Base):
    __tablename__ = "user_topic_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id"), nullable=False)
    problems_attempted = Column(Integer, default=0)
    problems_solved = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    last_practiced = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (UniqueConstraint('user_id', 'topic_id', name='uix_user_topic_progress'),)


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=True)
    bookmark_type = Column(String(30), nullable=True)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=True)
    content = Column(Text, nullable=True)
    tags = Column(ARRAY(String), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CodeVersion(Base):
    __tablename__ = "code_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=False)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=True)
    code = Column(Text, nullable=False)
    language = Column(String(20), nullable=True)
    version_number = Column(Integer, nullable=True)
    change_description = Column(String(500), nullable=True)
    time_complexity = Column(String(50), nullable=True)
    space_complexity = Column(String(50), nullable=True)
    test_results_snapshot = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BugPattern(Base):
    __tablename__ = "bug_patterns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    bug_type = Column(String(100), nullable=True)
    occurrences = Column(Integer, default=1)
    last_occurred = Column(DateTime(timezone=True), nullable=True)
    problem_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    description = Column(Text, nullable=True)


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    category = Column(String(50), nullable=True)
    requirement_count = Column(Integer, nullable=True)
    points = Column(Integer, default=10)


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    achievement_id = Column(UUID(as_uuid=True), ForeignKey("achievements.id"), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint('user_id', 'achievement_id', name='uix_user_achievement'),)


class DailyChallenge(Base):
    __tablename__ = "daily_challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=False)
    challenge_date = Column(Date, unique=True, nullable=False)
    difficulty = Column(String(10), nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    notification_type = Column(String(50), nullable=True)
    is_read = Column(Boolean, default=False)
    link = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=True)
    interaction_type = Column(String(50), nullable=True)
    prompt = Column(Text, nullable=True)
    response = Column(Text, nullable=True)
    hint_level = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LearningJournal(Base):
    __tablename__ = "learning_journals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    entry_date = Column(Date, nullable=False)
    topics_practiced = Column(ARRAY(String), nullable=True)
    problems_solved_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    mistakes_made = Column(JSON, nullable=True)
    improvements = Column(JSON, nullable=True)
    auto_summary = Column(Text, nullable=True)
    user_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
