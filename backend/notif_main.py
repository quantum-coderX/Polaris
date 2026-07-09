"""
notif-service — Microservice entrypoint
Owns: /api/v1/notifications/* (HTTP + WebSocket)

Also exposes:
  POST /internal/notify   ← internal-only endpoint, NOT routed through Nginx.
  Called by payment-service after a successful Stripe webhook to push
  enrollment confirmation notifications to users.

Runs on port 8002 inside Docker network.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.database import engine, Base
from app.api.v1 import notifications
from app.api.v1.notifications import send_notification
from app.models.notification import NotificationType

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Polaris — Notification Service",
    version=settings.APP_VERSION,
    description="Real-time WebSocket push & notification persistence microservice",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

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
app.include_router(notifications.router, prefix=PREFIX)


# ── Internal cross-service endpoint ──────────────────────────────────────────

class InternalNotifyRequest(BaseModel):
    user_id: int
    type: str = "enrollment"
    title: str
    message: str
    action_url: str = ""


@app.post("/internal/notify", tags=["Internal"], status_code=202)
async def internal_notify(
    body: InternalNotifyRequest,
    x_internal_token: str = Header(..., alias="X-Internal-Token"),
):
    """
    Internal-only endpoint called by payment-service after a confirmed Stripe
    payment. Persists notification to DB and pushes it over WebSocket if the
    user is currently connected.

    This endpoint is NOT exposed through Nginx (no matching location block),
    so it is only reachable from within the Docker network.
    """
    if x_internal_token != settings.INTERNAL_AUTH_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid internal token")

    try:
        type_enum = NotificationType(body.type)
    except ValueError:
        type_enum = NotificationType.enrollment

    await send_notification(
        user_id=body.user_id,
        type=type_enum,
        title=body.title,
        message=body.message,
        action_url=body.action_url,
    )
    return {"status": "queued"}



# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"service": "notif-service", "status": "ok", "version": settings.APP_VERSION}
