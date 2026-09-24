from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid
from pydantic import BaseModel

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services import social_service

router = APIRouter()

class InterviewStartRequest(BaseModel):
    session_type: str
    difficulty: str
    company_style: str

class InterviewMessageRequest(BaseModel):
    message: str
    code: Optional[str] = ""

@router.get("/leaderboard")
async def get_leaderboard(
    timeframe: str = Query("all_time", description="Filter by timeframe (all_time, monthly, weekly)"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    leaderboard = await social_service.get_leaderboard(db, timeframe=timeframe, limit=limit)
    return {"leaderboard": leaderboard}

@router.get("/contests")
async def get_contests(
    status: str = Query("upcoming", description="Filter by status (upcoming, active, past)"),
    db: AsyncSession = Depends(get_db)
):
    contests = await social_service.get_contests(db, status=status)
    return {"contests": contests}

@router.get("/contests/{contest_id}/leaderboard")
async def get_contest_leaderboard(
    contest_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    leaderboard = await social_service.get_contest_leaderboard(contest_id, db)
    return {"leaderboard": leaderboard}

@router.post("/contests/{contest_id}/join")
async def join_contest(
    contest_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        participation = await social_service.join_contest(current_user.id, contest_id, db)
        return {"message": "Successfully joined contest", "participation_id": participation.id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not join contest: {str(e)}"
        )

@router.post("/interviews/start")
async def start_interview(
    request: InterviewStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = await social_service.start_interview(
        current_user.id,
        request.session_type,
        request.difficulty,
        request.company_style,
        db
    )
    return {"session": session}

@router.post("/interviews/{session_id}/message")
async def continue_interview(
    session_id: uuid.UUID,
    request: InterviewMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ai_response = await social_service.continue_interview(
        session_id,
        request.message,
        request.code,
        db
    )
    if not ai_response:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")
        
    return {"response": ai_response}

@router.post("/interviews/{session_id}/end")
async def end_interview(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = await social_service.end_interview(session_id, db)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")
        
    return {"session": session}

@router.get("/interviews")
async def get_user_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select
    from app.models.social import InterviewSession
    
    query = select(InterviewSession).where(InterviewSession.user_id == current_user.id).order_by(InterviewSession.started_at.desc())
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    return {"sessions": sessions}

@router.get("/interviews/{session_id}")
async def get_interview_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select
    from app.models.social import InterviewSession
    
    query = select(InterviewSession).where(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    )
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")
        
    return {"session": session}
