from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database Settings
    DATABASE_URL: str = "sqlite+aiosqlite:///./codementor.db"
    DATABASE_URL_SYNC: str = "sqlite:///./codementor.db"
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
