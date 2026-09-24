from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid

class RunCodeRequest(BaseModel):
    problem_id: uuid.UUID
    code: str
    language: str
    custom_input: Optional[str] = None

class SubmitCodeRequest(BaseModel):
    problem_id: uuid.UUID
    code: str
    language: str

class SubmissionResultResponse(BaseModel):
    test_case_id: uuid.UUID
    status: Optional[str] = None
    actual_output: Optional[str] = None
    expected_output: Optional[str] = None
    runtime_ms: Optional[int] = None
    memory_kb: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class SubmissionResponse(BaseModel):
    id: uuid.UUID
    status: Optional[str] = None
    runtime_ms: Optional[int] = None
    memory_kb: Optional[int] = None
    total_test_cases: int
    passed_test_cases: int
    compiler_output: Optional[str] = None
    error_output: Optional[str] = None
    results: List[SubmissionResultResponse]

    model_config = ConfigDict(from_attributes=True)

class SubmissionHistoryItem(BaseModel):
    id: uuid.UUID
    problem_title: str
    language: str
    status: Optional[str] = None
    runtime_ms: Optional[int] = None
    passed_test_cases: int
    total_test_cases: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
