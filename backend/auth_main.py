"""
auth-service — Microservice entrypoint
Owns: /api/v1/auth/* and /api/v1/users/*

Runs on port 8001 inside Docker network.
All external traffic arrives via the Nginx gateway.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import get_settings
from app.core.database import engine
from app.core.limiter import limiter, rate_limit_exceeded_handler
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tables are managed by core-service via Alembic / create_all.
    # This service only connects to the shared DB — no DDL.
    yield
    await engine.dispose()


app = FastAPI(
    title="Polaris — Auth Service",
    version=settings.APP_VERSION,
    description="Identity & session management microservice",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Rate limiter ─────────────────────────────────────────────────────────────
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

app.include_router(auth_router,  prefix=PREFIX)
app.include_router(users_router, prefix=PREFIX)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"service": "auth-service", "status": "ok", "version": settings.APP_VERSION}