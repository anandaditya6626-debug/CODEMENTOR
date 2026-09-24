from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.learning import AIInteraction
from app.middleware.auth import get_current_user, get_optional_user
from app.services.ai_service import ai_service, AIServiceError
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Request/Response Schemas ---

class HintRequest(BaseModel):
    problem_id: Optional[str] = None
    problem_title: str
    problem_description: str
    code: str
    language: str
    hint_level: int = Field(ge=1, le=5, default=1)
    previous_hints: list[str] = []

class ExplainRequest(BaseModel):
    code: str
    language: str
    problem_context: str = ''
    mode: str = 'beginner'  # beginner, intermediate, interview

class DebugRequest(BaseModel):
    code: str
    language: str
    error_output: str
    problem_context: str = ''

class ComplexityRequest(BaseModel):
    code: str
    language: str

class EdgeCaseRequest(BaseModel):
    code: str
    language: str
    problem_description: str

class ReviewRequest(BaseModel):
    code: str
    language: str
    problem_context: str = ''

# --- Routes ---

@router.get('/status')
async def ai_status():
    """Check if AI service is available."""
    return {
        'available': ai_service.is_available,
        'provider': getattr(ai_service.provider, '__class__', type(None)).__name__ if ai_service.provider else None
    }

@router.post('/hint')
async def get_hint(
    req: HintRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get progressive hint (Level 1-5)."""
    try:
        result = await ai_service.generate_hint(
            problem_title=req.problem_title,
            problem_description=req.problem_description,
            code=req.code,
            language=req.language,
            hint_level=req.hint_level,
            previous_hints=req.previous_hints,
        )
        
        # Log interaction if user is logged in
        if user:
            interaction = AIInteraction(
                user_id=user.id,
                problem_id=req.problem_id if req.problem_id else None,
                interaction_type='hint',
                prompt=f'Level {req.hint_level} hint for {req.problem_title}',
                response=result.get('hint', ''),
                hint_level=req.hint_level,
            )
            db.add(interaction)
            await db.commit()
        
        return result
    except AIServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.post('/explain')
async def explain_code(
    req: ExplainRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Explain code at different levels."""
    try:
        result = await ai_service.explain_code(
            code=req.code,
            language=req.language,
            problem_context=req.problem_context,
            mode=req.mode,
        )
        
        if user:
            interaction = AIInteraction(
                user_id=user.id,
                interaction_type='explain',
                prompt=f'Explain code ({req.mode} mode)',
                response=result.get('explanation', ''),
            )
            db.add(interaction)
            await db.commit()
        
        return result
    except AIServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.post('/debug')
async def debug_code(
    req: DebugRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Debug code with root cause analysis."""
    try:
        result = await ai_service.debug_code(
            code=req.code,
            language=req.language,
            error_output=req.error_output,
            problem_context=req.problem_context,
        )
        
        if user:
            interaction = AIInteraction(
                user_id=user.id,
                interaction_type='debug',
                prompt=f'Debug code ({req.language})',
                response=result.get('analysis', ''),
            )
            db.add(interaction)
            await db.commit()
        
        return result
    except AIServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.post('/complexity')
async def analyze_complexity(
    req: ComplexityRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Analyze time and space complexity."""
    try:
        result = await ai_service.analyze_complexity(
            code=req.code,
            language=req.language,
        )
        
        if user:
            interaction = AIInteraction(
                user_id=user.id,
                interaction_type='complexity',
                prompt=f'Analyze complexity ({req.language})',
                response=str(result),
            )
            db.add(interaction)
            await db.commit()
        
        return result
    except AIServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.post('/edge-cases')
async def detect_edge_cases(
    req: EdgeCaseRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Detect potential edge cases."""
    try:
        result = await ai_service.detect_edge_cases(
            code=req.code,
            language=req.language,
            problem_description=req.problem_description,
        )
        
        if user:
            interaction = AIInteraction(
                user_id=user.id,
                interaction_type='edge_cases',
                prompt=f'Edge case detection ({req.language})',
                response=str(result),
            )
            db.add(interaction)
            await db.commit()
        
        return result
    except AIServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.post('/review')
async def review_code(
    req: ReviewRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """CodeMentor Analysis — Code quality review."""
    try:
        result = await ai_service.review_code(
            code=req.code,
            language=req.language,
            problem_context=req.problem_context,
        )
        
        if user:
            interaction = AIInteraction(
                user_id=user.id,
                interaction_type='review',
                prompt=f'Code review ({req.language})',
                response=str(result),
            )
            db.add(interaction)
            await db.commit()
        
        return result
    except AIServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))
