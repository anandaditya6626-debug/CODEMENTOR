from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database Settings
    DATABASE_URL: str
    DATABASE_URL_SYNC: str
    REDIS_URL: str

    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Judge0 Settings
    JUDGE0_API_URL: str
    JUDGE0_API_KEY: str

    # AI Provider Settings
    AI_PROVIDER: str
    OPENAI_API_KEY: str
    OPENAI_MODEL: str
    GEMINI_API_KEY: str
    GEMINI_MODEL: str
    ANTHROPIC_API_KEY: str
    ANTHROPIC_MODEL: str

    # App Settings
    APP_NAME: str = "CodeMentor"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
