from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://aivoa_user:aivoa_pass@localhost:5432/aivoa_complaints"

    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    GROQ_API_KEY: str = ""
    GROQ_PRIMARY_MODEL: str = "gemma2-9b-it"
    GROQ_FALLBACK_MODEL: str = "llama-3.3-70b-versatile"

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    MAX_UPLOAD_MB: int = 10
    UPLOAD_DIR: str = "./uploads"


settings = Settings()
