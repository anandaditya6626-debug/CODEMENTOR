from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, Profile
from app.models.learning import UserAchievement, Notification
from app.middleware.auth import get_current_user
from typing import Any

router = APIRouter()

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"user": current_user, "profile": profile}

@router.put("/profile")
async def update_profile(data: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if "bio" in data: profile.bio = data["bio"]
    if "github_url" in data: profile.github_url = data["github_url"]
    if "linkedin_url" in data: profile.linkedin_url = data["linkedin_url"]
    if "website" in data: profile.website = data["website"]
    
    await db.commit()
    return {"message": "Profile updated successfully"}

@router.post("/onboarding")
async def save_onboarding(data: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    profile.preparing_for = data.get("preparing_for")
    profile.skill_level = data.get("skill_level")
    profile.preferred_languages = data.get("preferred_languages")
    profile.daily_target_minutes = data.get("daily_target_minutes")
    
    await db.commit()
    return {"message": "Onboarding saved successfully"}

@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "problems_solved": profile.problems_solved,
        "current_streak": profile.current_streak,
        "longest_streak": profile.longest_streak,
        "accuracy_percentage": profile.accuracy_percentage,
        "learning_progress": profile.learning_progress
    }

@router.get("/achievements")
async def get_achievements(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserAchievement).where(UserAchievement.user_id == current_user.id))
    achievements = result.scalars().all()
    return achievements

@router.get("/notifications")
async def get_notifications(page: int = 1, page_size: int = 20, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc()).offset(offset).limit(page_size)
    )
    notifications = result.scalars().all()
    return notifications

@router.put("/notifications/{id}/read")
async def mark_notification_read(id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).where(Notification.id == id, Notification.user_id == current_user.id))
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}
