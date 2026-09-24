import jwt
import bcrypt
import secrets
from datetime import datetime, timedelta
from app.config import settings
from typing import Optional

def _get_jwt_secret() -> str:
    return getattr(settings, 'JWT_SECRET_KEY', None) or getattr(settings, 'SECRET_KEY', 'default-secret-key-12345')

def _get_jwt_algorithm() -> str:
    return getattr(settings, 'JWT_ALGORITHM', None) or getattr(settings, 'ALGORITHM', 'HS256')

def _get_access_token_expire() -> int:
    return getattr(settings, 'JWT_ACCESS_TOKEN_EXPIRE_MINUTES', None) or getattr(settings, 'ACCESS_TOKEN_EXPIRE_MINUTES', 30)

def _get_refresh_token_expire() -> int:
    return getattr(settings, 'JWT_REFRESH_TOKEN_EXPIRE_DAYS', None) or getattr(settings, 'REFRESH_TOKEN_EXPIRE_DAYS', 7)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = plain.encode('utf-8')[:72]
        return bcrypt.checkpw(pwd_bytes, hashed.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=_get_access_token_expire())
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, _get_jwt_secret(), algorithm=_get_jwt_algorithm())
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=_get_refresh_token_expire())
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, _get_jwt_secret(), algorithm=_get_jwt_algorithm())
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[_get_jwt_algorithm()])
        return payload
    except jwt.PyJWTError:
        return None

def generate_verification_token() -> str:
    return secrets.token_urlsafe(32)

def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)
