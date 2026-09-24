from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.problem import Problem, TestCase
from app.models.submission import Submission
from app.middleware.auth import get_admin_user
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class ProblemCreate(BaseModel):
    title: str
    slug: str
    description: str
    difficulty: str
    expected_time_complexity: Optional[str]
    expected_space_complexity: Optional[str]

class TestCaseCreate(BaseModel):
    input_data: str
    expected_output: str
    is_hidden: bool = False

@router.get("/stats")
async def get_stats(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    users_count = await db.scalar(select(func.count(User.id)))
    problems_count = await db.scalar(select(func.count(Problem.id)))
    submissions_count = await db.scalar(select(func.count(Submission.id)))
    return {
        "total_users": users_count,
        "total_problems": problems_count,
        "total_submissions": submissions_count
    }

@router.get("/users")
async def list_users(page: int = 1, page_size: int = 20, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * page_size
    result = await db.execute(select(User).offset(offset).limit(page_size))
    return result.scalars().all()

@router.post("/problems")
async def create_problem(req: ProblemCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    p = Problem(**req.dict())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p

@router.put("/problems/{id}")
async def update_problem(id: str, req: ProblemCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Problem).where(Problem.id == id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    for k, v in req.dict().items():
        setattr(p, k, v)
    await db.commit()
    return p

@router.delete("/problems/{id}")
async def delete_problem(id: str, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Problem).where(Problem.id == id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Problem not found")
    # assuming hard delete for now
    await db.delete(p)
    await db.commit()
    return {"message": "Deleted"}

@router.post("/problems/{id}/test-cases")
async def add_test_case(id: str, req: TestCaseCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    tc = TestCase(problem_id=id, **req.dict())
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return tc

@router.put("/test-cases/{id}")
async def update_test_case(id: str, req: TestCaseCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TestCase).where(TestCase.id == id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    for k, v in req.dict().items():
        setattr(tc, k, v)
    await db.commit()
    return tc

@router.delete("/test-cases/{id}")
async def delete_test_case(id: str, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TestCase).where(TestCase.id == id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    await db.delete(tc)
    await db.commit()
    return {"message": "Deleted"}
