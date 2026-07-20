"""
payment-service — Microservice entrypoint
Owns: /api/v1/payments/*

Cross-service event flow:
  1. Stripe sends POST /api/v1/payments/webhook/stripe (verified signature)
  2. payment-service creates Enrollment in shared DB
  3. payment-service calls notif-service POST /internal/notify  (HTTP, Docker network)
  4. notif-service persists Notification + pushes WebSocket to user

Runs on port 8003 inside Docker network.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine
from app.api.v1.payments import router as payments_router

settings = get_settings()

# Internal URL for notif-service — overridable via env for local dev
NOTIF_SERVICE_URL = os.getenv("NOTIF_SERVICE_URL", "http://notif-service:8002")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tables are managed by core-service via Alembic / create_all.
    yield
    await engine.dispose()


app = FastAPI(
    title="Polaris — Payment Service",
    version=settings.APP_VERSION,
    description="Stripe billing & payment lifecycle microservice",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Store notif-service URL on app state so payments router can reach it ─────
app.state.notif_service_url = NOTIF_SERVICE_URL

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"
app.include_router(payments_router, prefix=PREFIX)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"service": "payment-service", "status": "ok", "version": settings.APP_VERSION}