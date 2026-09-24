import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.auth_service import verify_token
from app.models.user import User
from sqlalchemy import select

security = HTTPBearer()

def _to_uuid(uid: any):
    if not uid:
        return uid
    if isinstance(uid, uuid.UUID):
        return uid
    try:
        return uuid.UUID(str(uid))
    except Exception:
        return uid

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    user_id = _to_uuid(payload.get('sub'))
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    if not user.is_active:
        raise HTTPException(status_code=403, detail='Account is deactivated')
    return user

async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail='Admin access required')
    return user

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
):
    if not credentials:
        return None
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        return None
    user_id = _to_uuid(payload.get('sub'))
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user and not user.is_active:
        return None
    return user
