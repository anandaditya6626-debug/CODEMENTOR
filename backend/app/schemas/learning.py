from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid

class BookmarkCreate(BaseModel):
    problem_id: Optional[uuid.UUID] = None
    bookmark_type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None

class BookmarkResponse(BaseModel):
    id: uuid.UUID
    problem_id: Optional[uuid.UUID] = None
    bookmark_type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NoteCreate(BaseModel):
    problem_id: Optional[uuid.UUID] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class NoteUpdate(BaseModel):
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class NoteResponse(BaseModel):
    id: uuid.UUID
    problem_id: Optional[uuid.UUID] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TopicProgressResponse(BaseModel):
    topic_name: str
    problems_attempted: int
    problems_solved: int
    accuracy: float
    confidence: float

    model_config = ConfigDict(from_attributes=True)

class SkillGraphResponse(BaseModel):
    topics: List[TopicProgressResponse]

class AchievementResponse(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    earned_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: Optional[str] = None
    notification_type: Optional[str] = None
    is_read: bool
    link: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
