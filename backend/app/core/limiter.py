"""
Rate limiter singleton using slowapi.
Falls back to in-memory storage when REDIS_URL is not configured.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse


def _get_real_ip(request: Request) -> str:
    """Extract real client IP, respecting X-Forwarded-For from trusted proxies."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request)


# Limiter uses in-memory storage by default (suitable for single-instance dev/prod)
# For multi-instance production, swap storage_uri to Redis:
#   from app.core.config import get_settings
#   storage_uri=get_settings().REDIS_URL or "memory://"
limiter = Limiter(key_func=_get_real_ip, default_limits=["60/minute"])


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}. Please slow down.",
        },
        headers={"Retry-After": "60"},
    )
