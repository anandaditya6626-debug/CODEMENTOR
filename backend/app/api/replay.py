"""
Code Replay API Endpoint.

Provides execution step tracing for interactive line-by-line debugging.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.replay_service import replay_service

router = APIRouter()


class TraceRequest(BaseModel):
    code: str
    language: str = 'python'


class ExecutionStep(BaseModel):
    step: int
    line: int
    event: str
    func: str
    variables: Dict[str, str]
    stdout: str


class TraceResponse(BaseModel):
    status: str
    steps: List[ExecutionStep]
    total_steps: int
    error: Optional[str] = None
    stdout: Optional[str] = None


@router.post('/trace', response_model=TraceResponse)
async def trace_code(req: TraceRequest):
    """
    Trace Python code execution line-by-line.
    Returns step snapshots containing line numbers, local variables, and stdout.
    """
    if req.language.lower() != 'python':
        raise HTTPException(
            status_code=400,
            detail=f"Code Replay is currently supported for Python. {req.language} support is planned for a future release.",
        )

    if not req.code.strip():
        return TraceResponse(status='empty', steps=[], total_steps=0)

    result = await replay_service.trace_python(req.code)
    return TraceResponse(
        status=result.get('status', 'success'),
        steps=[ExecutionStep(**s) for s in result.get('steps', [])],
        total_steps=result.get('total_steps', 0),
        error=result.get('error'),
        stdout=result.get('stdout'),
    )
