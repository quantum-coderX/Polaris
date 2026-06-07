from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "LearnHub API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    # Database (async)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/learnhub"

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "learnhub-media"
    AWS_REGION: str = "ap-south-1"

    # Stripe (sandbox)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # 2FA / TOTP
    TOTP_ISSUER: str = "LearnHub"

    # Rate limiting (requests per minute)
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_REGISTER: str = "3/minute"
    RATE_LIMIT_DEFAULT: str = "60/minute"

    # Redis (optional — falls back to in-memory limiter if empty)
    REDIS_URL: str = ""

    # Email (optional — for future OTP email support)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: str = "noreply@learnhub.io"

    # Frontend URL (used in certificate verification links)
    FRONTEND_URL: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
