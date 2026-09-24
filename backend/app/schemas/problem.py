from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import uuid

class TopicResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    problem_count: int

    model_config = ConfigDict(from_attributes=True)

class TestCaseResponse(BaseModel):
    id: uuid.UUID
    input_data: str
    expected_output: str
    is_sample: bool

    model_config = ConfigDict(from_attributes=True)

class ProblemListItem(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    difficulty: str
    topics: List[str]
    acceptance_rate: float
    is_solved: bool

    model_config = ConfigDict(from_attributes=True)

class ProblemDetail(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    description: str
    difficulty: str
    examples: Optional[Any] = None
    constraints: Optional[Any] = None
    hints: Optional[Any] = None
    expected_time_complexity: Optional[str] = None
    expected_space_complexity: Optional[str] = None
    starter_code: Optional[Dict[str, str]] = None
    solution_code: Optional[Dict[str, str]] = None
    solution_explanation: Optional[str] = None
    pattern_tags: Optional[List[str]] = None
    total_submissions: int
    accepted_submissions: int
    topics: List[TopicResponse]
    test_cases: List[TestCaseResponse]

    model_config = ConfigDict(from_attributes=True)

class ProblemListResponse(BaseModel):
    problems: List[ProblemListItem]
    total: int
    page: int
    page_size: int

class ProblemCreateRequest(BaseModel):
    title: str
    description: str
    difficulty: str
    examples: Optional[Any] = None
    constraints: Optional[Any] = None
    hints: Optional[Any] = None
    topic_ids: List[uuid.UUID]
    starter_code: Optional[Dict[str, str]] = None
    solution_code: Optional[Dict[str, str]] = None
    test_cases: List[Dict[str, Any]]
