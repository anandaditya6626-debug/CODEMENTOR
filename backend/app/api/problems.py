from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from app.database import get_db
from app.models.problem import Problem, Topic, ProblemTopic, TestCase
from app.models.submission import Submission
from app.models.user import User
from app.middleware.auth import get_optional_user, get_current_user
from sqlalchemy.orm import selectinload

router = APIRouter()

@router.get("/")
async def list_problems(
    page: int = 1,
    page_size: int = 20,
    difficulty: Optional[str] = None,
    topic_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "id",
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Problem)
    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if search:
        query = query.where(Problem.title.ilike(f"%{search}%"))
    if topic_id:
        query = query.join(ProblemTopic).where(ProblemTopic.topic_id == topic_id)
        
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    problems = result.scalars().all()
    
    # Very basic status resolution
    return {"items": problems, "page": page, "page_size": page_size}

@router.get("/topics")
async def list_topics(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Topic))
    return result.scalars().all()

@router.get("/daily")
async def get_daily(db: AsyncSession = Depends(get_db)):
    # simple mock: fetch a random problem
    result = await db.execute(select(Problem).order_by(func.random()).limit(1))
    prob = result.scalar_one_or_none()
    if not prob:
        raise HTTPException(status_code=404, detail="No daily problem found")
    return prob

@router.get("/recommended")
async def get_recommended(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Problem).limit(5))
    return result.scalars().all()

@router.get("/{slug}")
async def get_problem(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Problem).options(selectinload(Problem.test_cases)).where(Problem.slug == slug)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    visible_test_cases = [tc for tc in problem.test_cases if not tc.is_hidden]
    data = problem.__dict__.copy()
    data['test_cases'] = visible_test_cases
    return data

@router.get("/{id}/submissions")
async def get_problem_submissions(id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Submission).where(and_(Submission.problem_id == id, Submission.user_id == user.id))
        .order_by(Submission.created_at.desc())
    )
    return result.scalars().all()
