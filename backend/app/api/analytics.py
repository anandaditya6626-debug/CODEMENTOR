from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.analytics_service import analytics_service

router = APIRouter()

@router.get("/overview", response_model=Dict[str, Any])
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive overview stats."""
    return await analytics_service.get_overview_stats(current_user.id, db)

@router.get("/submission-trends", response_model=List[Dict[str, Any]])
async def get_submission_trends(
    days: int = Query(30, description="Number of days"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get daily submission trends."""
    return await analytics_service.get_submission_trends(current_user.id, db, days=days)

@router.get("/topic-radar", response_model=List[Dict[str, Any]])
async def get_topic_radar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get accuracy by topic for radar chart."""
    return await analytics_service.get_topic_radar(current_user.id, db)

@router.get("/activity-heatmap", response_model=List[Dict[str, Any]])
async def get_activity_heatmap(
    weeks: int = Query(52, description="Number of weeks"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get activity data for heatmap (GitHub-style)."""
    return await analytics_service.get_activity_heatmap(current_user.id, db, weeks=weeks)

@router.get("/progress", response_model=List[Dict[str, Any]])
async def get_progress_over_time(
    months: int = Query(6, description="Number of months"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get monthly progress summary."""
    return await analytics_service.get_progress_over_time(current_user.id, db, months=months)

@router.get("/difficulty-distribution", response_model=Dict[str, Any])
async def get_difficulty_distribution(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get solved problems distribution by difficulty."""
    return await analytics_service.get_difficulty_distribution(current_user.id, db)

@router.get("/recent-activity", response_model=List[Dict[str, Any]])
async def get_recent_activity(
    limit: int = Query(20, description="Limit"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get recent submissions with problem details."""
    return await analytics_service.get_recent_activity(current_user.id, db, limit=limit)
