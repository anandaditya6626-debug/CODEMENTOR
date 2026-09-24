from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.learning import Bookmark
from app.middleware.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class BookmarkCreate(BaseModel):
    problem_id: str

@router.get("/")
async def list_bookmarks(page: int = 1, page_size: int = 20, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * page_size
    result = await db.execute(select(Bookmark).where(Bookmark.user_id == user.id).offset(offset).limit(page_size))
    return result.scalars().all()

@router.post("/")
async def create_bookmark(req: BookmarkCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bookmark).where(Bookmark.user_id == user.id, Bookmark.problem_id == req.problem_id))
    existing = result.scalar_one_or_none()
    if existing:
        return existing
    bm = Bookmark(user_id=user.id, problem_id=req.problem_id)
    db.add(bm)
    await db.commit()
    await db.refresh(bm)
    return bm

@router.delete("/{id}")
async def delete_bookmark(id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bookmark).where(Bookmark.id == id, Bookmark.user_id == user.id))
    bm = result.scalar_one_or_none()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    await db.delete(bm)
    await db.commit()
    return {"message": "Deleted"}
