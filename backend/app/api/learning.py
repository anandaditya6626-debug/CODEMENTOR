from datetime import date
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from uuid import UUID

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.learning_service import learning_service

router = APIRouter()

class CodeVersionCreate(BaseModel):
    problem_id: str
    code: str
    language: str
    description: str

class JournalNoteCreate(BaseModel):
    entry_date: date
    notes: str

@router.get("/skill-graph")
async def get_skill_graph(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await learning_service.get_skill_graph_data(current_user.id, db)

@router.get("/roadmap")
async def get_roadmap(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await learning_service.get_personalized_roadmap(current_user.id, db)

@router.get("/adaptive-problem/{topic_slug}")
async def get_adaptive_problem_route(
    topic_slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    problem = await learning_service.get_adaptive_problem(current_user.id, topic_slug, db)
    if not problem:
        raise HTTPException(status_code=404, detail="No suitable problem found for this topic")
    return problem

@router.get("/bug-patterns")
async def get_bug_patterns_route(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await learning_service.get_bug_patterns(current_user.id, db)

@router.get("/code-versions/{problem_id}")
async def get_code_versions_route(
    problem_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await learning_service.get_code_versions(current_user.id, problem_id, db)

@router.post("/code-versions")
async def save_code_version_route(
    data: CodeVersionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await learning_service.save_code_version(
        current_user.id,
        data.problem_id,
        data.code,
        data.language,
        data.description,
        db
    )

@router.get("/daily-challenge")
async def get_daily_challenge_route(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    challenge = await learning_service.get_daily_challenge(db)
    if not challenge:
        raise HTTPException(status_code=404, detail="No daily challenge available")
    return challenge

@router.get("/journal")
async def get_journal_entries_route(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await learning_service.get_journal_entries(current_user.id, db)

@router.post("/journal")
async def save_journal_note_route(
    data: JournalNoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await learning_service.save_journal_note(
        current_user.id,
        data.entry_date,
        data.notes,
        db
    )

@router.post("/check-achievements")
async def check_achievements_route(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await learning_service.check_achievements(current_user.id, db)
