import uuid
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.problem import Problem, TestCase
from app.models.submission import Submission
from app.middleware.auth import get_current_user, get_optional_user
from app.services.execution_service import execution_service
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

class RunRequest(BaseModel):
    problem_id: str
    code: str
    language: str
    test_cases: Optional[List[Dict[str, Any]]] = None

class SubmitRequest(BaseModel):
    problem_id: str
    code: str
    language: str
    test_cases: Optional[List[Dict[str, Any]]] = None

async def _resolve_problem(db: AsyncSession, identifier: str) -> Optional[Problem]:
    """Resolve a problem by slug or by UUID string."""
    if not identifier:
        return None
    # 1. Try slug
    result = await db.execute(select(Problem).where(Problem.slug == identifier))
    prob = result.scalar_one_or_none()
    if prob:
        return prob
    # 2. Try UUID
    try:
        u = uuid.UUID(identifier)
        result = await db.execute(select(Problem).where(Problem.id == u))
        return result.scalar_one_or_none()
    except (ValueError, TypeError, AttributeError):
        pass
    return None

@router.post("/run")
async def run_code(req: RunRequest, user: Optional[User] = Depends(get_optional_user), db: AsyncSession = Depends(get_db)):
    problem = await _resolve_problem(db, req.problem_id)
    tc_dicts: List[Dict[str, Any]] = []

    if req.test_cases:
        tc_dicts = req.test_cases
    elif problem:
        result_tc = await db.execute(
            select(TestCase).where(TestCase.problem_id == problem.id, TestCase.is_hidden == False)
        )
        test_cases = result_tc.scalars().all()
        tc_dicts = [{"id": str(tc.id), "input_data": tc.input_data, "expected_output": tc.expected_output} for tc in test_cases]
    else:
        # Fallback to seed catalog if database does not yet have this problem seeded
        from seed.problems_data import PROBLEMS
        seed_prob = next((p for p in PROBLEMS if p.get('slug') == req.problem_id), None)
        if seed_prob and seed_prob.get('test_cases'):
            tc_dicts = [
                {"id": f"seed_{i}", "input_data": tc.get('input_data', ''), "expected_output": tc.get('expected_output', '')}
                for i, tc in enumerate(seed_prob['test_cases'])
                if not tc.get('is_hidden', False)
            ]
        else:
            raise HTTPException(status_code=404, detail="Problem not found")

    results = await execution_service.run_test_cases(req.code, req.language, tc_dicts)
    
    sub_id = None
    if user and problem:
        sub = Submission(
            user_id=user.id,
            problem_id=problem.id,
            code=req.code,
            language=req.language,
            status="success" if all(r.get('passed') for r in results) else "failed",
            is_run=True,
        )
        db.add(sub)
        await db.commit()
        sub_id = str(sub.id)

    return {"submission_id": sub_id or "guest_run", "results": results}

@router.post("/submit")
async def submit_code(req: SubmitRequest, user: Optional[User] = Depends(get_optional_user), db: AsyncSession = Depends(get_db)):
    problem = await _resolve_problem(db, req.problem_id)
    tc_dicts: List[Dict[str, Any]] = []

    if problem:
        result_tc = await db.execute(select(TestCase).where(TestCase.problem_id == problem.id))
        test_cases = result_tc.scalars().all()
        tc_dicts = [{"id": str(tc.id), "input_data": tc.input_data, "expected_output": tc.expected_output, "is_hidden": tc.is_hidden} for tc in test_cases]
    else:
        from seed.problems_data import PROBLEMS
        seed_prob = next((p for p in PROBLEMS if p.get('slug') == req.problem_id), None)
        if seed_prob and seed_prob.get('test_cases'):
            tc_dicts = [
                {"id": f"seed_{i}", "input_data": tc.get('input_data', ''), "expected_output": tc.get('expected_output', ''), "is_hidden": tc.get('is_hidden', False)}
                for i, tc in enumerate(seed_prob['test_cases'])
            ]
        else:
            raise HTTPException(status_code=404, detail="Problem not found")

    results = await execution_service.run_test_cases(req.code, req.language, tc_dicts)
    
    passed_all = all(r.get('passed') for r in results)
    sub_status = "accepted" if passed_all else "wrong_answer"
    sub_id = None

    if user and problem:
        sub = Submission(
            user_id=user.id,
            problem_id=problem.id,
            code=req.code,
            language=req.language,
            status=sub_status,
            is_run=False,
        )
        db.add(sub)
        await db.commit()
        sub_id = str(sub.id)

    for r, tc in zip(results, tc_dicts):
        if tc.get('is_hidden'):
            r.pop('input_data', None)
            r.pop('expected_output', None)
            r.pop('stdout', None)

    return {"submission_id": sub_id or "guest_submit", "status": sub_status, "results": results}

@router.get("/history")
async def get_history(page: int = 1, page_size: int = 20, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * page_size
    result = await db.execute(select(Submission).where(Submission.user_id == user.id).order_by(Submission.created_at.desc()).offset(offset).limit(page_size))
    return result.scalars().all()

@router.get("/{id}")
async def get_submission(id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Submission).where(Submission.id == id, Submission.user_id == user.id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub
