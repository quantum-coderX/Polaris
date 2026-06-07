from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import get_settings
from app.core.database import engine, Base
from app.core.limiter import limiter, rate_limit_exceeded_handler
from app.api.v1 import (
    auth, users, courses, lessons, enrollments,
    payments, reviews, qa, search, notifications,
    admin, quizzes, certificates,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic in production for migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Cloud-Native Online Learning Platform API — Polaris",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Rate Limiter state ──────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────

PREFIX = "/api/v1"

app.include_router(auth.router,          prefix=PREFIX)
app.include_router(users.router,         prefix=PREFIX)
app.include_router(courses.router,       prefix=PREFIX)
app.include_router(lessons.router,       prefix=PREFIX)
app.include_router(enrollments.router,   prefix=PREFIX)
app.include_router(payments.router,      prefix=PREFIX)
app.include_router(reviews.router,       prefix=PREFIX)
app.include_router(qa.router,            prefix=PREFIX)
app.include_router(search.router,        prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(admin.router,         prefix=PREFIX)
app.include_router(quizzes.router,       prefix=PREFIX)
app.include_router(certificates.router,  prefix=PREFIX)


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
