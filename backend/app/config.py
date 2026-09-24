import os
import tempfile
from pydantic_settings import BaseSettings, SettingsConfigDict

_is_cloud = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
_default_sqlite_path = (
    os.path.join(tempfile.gettempdir(), 'codementor.db').replace('\\', '/')
    if _is_cloud
    else "./codementor.db"
)
_sqlite_prefix = "sqlite+aiosqlite:////" if _default_sqlite_path.startswith('/') else "sqlite+aiosqlite:///"
_sqlite_sync_prefix = "sqlite:////" if _default_sqlite_path.startswith('/') else "sqlite:///"

_default_async_db = f"{_sqlite_prefix}{_default_sqlite_path.lstrip('/')}"
_default_sync_db = f"{_sqlite_sync_prefix}{_default_sqlite_path.lstrip('/')}"

class Settings(BaseSettings):
    # Database Settings
    DATABASE_URL: str = _default_async_db
    DATABASE_URL_SYNC: str = _default_sync_db
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT Settings
    JWT_SECRET_KEY: str = "codementor-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Judge0 Settings
    JUDGE0_API_URL: str = "https://judge0-ce.p.rapidapi.com"
    JUDGE0_API_KEY: str = "placeholder"

    # AI Provider Settings
    AI_PROVIDER: str = "none"
    OPENAI_API_KEY: str = "placeholder"
    OPENAI_MODEL: str = "gpt-4o"
    GEMINI_API_KEY: str = "placeholder"
    GEMINI_MODEL: str = "gemini-1.5-pro"
    ANTHROPIC_API_KEY: str = "placeholder"
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    # App Settings
    APP_NAME: str = "CodeMentor"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
