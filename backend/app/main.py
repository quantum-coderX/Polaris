"""
core-service — Microservice entrypoint
Owns: courses, lessons, enrollments, reviews, Q&A, search, quizzes, certificates, admin

Extracted to separate services:
  auth, users    → auth-service      :8001
  payments       → payment-service   :8003
  notifications  → notif-service     :8002

All external traffic arrives via the Nginx gateway on port 80.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import get_settings
from app.core.database import engine, Base
from app.core.limiter import limiter, rate_limit_exceeded_handler
from app.websockets.qa_manager import manager as qa_manager
from app.api.v1 import (
    courses, lessons, enrollments,
    reviews, qa, search,
    admin, quizzes, certificates,
    gamification,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist (Alembic handles migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await qa_manager.start()
    yield
    await qa_manager.shutdown()
    await engine.dispose()


app = FastAPI(
    title="Polaris — Core Service",
    version=settings.APP_VERSION,
    description="Course platform domain microservice — courses, lessons, enrollments, Q&A, search",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Rate Limiter ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(courses.router,      prefix=PREFIX)
app.include_router(lessons.router,      prefix=PREFIX)
app.include_router(enrollments.router,  prefix=PREFIX)
app.include_router(reviews.router,      prefix=PREFIX)
app.include_router(qa.router,           prefix=PREFIX)
app.include_router(search.router,       prefix=PREFIX)
app.include_router(admin.router,        prefix=PREFIX)
app.include_router(quizzes.router,      prefix=PREFIX)
app.include_router(certificates.router, prefix=PREFIX)
app.include_router(gamification.router, prefix=PREFIX)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"service": "core-service", "status": "ok", "version": settings.APP_VERSION}
