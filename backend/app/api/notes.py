from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.learning import Note
from app.middleware.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class NoteCreate(BaseModel):
    problem_id: str
    content: str

class NoteUpdate(BaseModel):
    content: str

@router.get("/")
async def list_notes(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.user_id == user.id))
    return result.scalars().all()

@router.get("/problem/{problem_id}")
async def get_problem_notes(problem_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.user_id == user.id, Note.problem_id == problem_id))
    return result.scalars().all()

@router.post("/")
async def create_note(req: NoteCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    note = Note(user_id=user.id, problem_id=req.problem_id, content=req.content)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note

@router.put("/{id}")
async def update_note(id: str, req: NoteUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == id, Note.user_id == user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.content = req.content
    await db.commit()
    return note

@router.delete("/{id}")
async def delete_note(id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == id, Note.user_id == user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
    return {"message": "Deleted"}
