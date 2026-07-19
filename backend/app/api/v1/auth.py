import io
import base64
import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.core.config import get_settings
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.models.user import User, UserRole
import jwt

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TwoFAVerifyRequest,
    TwoFALoginRequest,
    TokenResponse,
    UserOut,
    TwoFASetupResponse,
)
from pydantic import SecretStr


class AdminLoginRequest(BaseModel):
    """Login body for the dedicated admin portal — requires extra secret key."""
    email: EmailStr
    password: str
    admin_secret: SecretStr


# ---- Helpers ---------------------------------------------------------------

def _generate_qr_b64(uri: str) -> str:
    """Generate QR code as base64 PNG string."""
    img = qrcode.make(uri)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


# ---- Endpoints -------------------------------------------------------------

@router.post("/register", response_model=UserOut, status_code=201)
@limiter.limit("3/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate email/username
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # ── Security: block self-registration as admin ──────────────────────────
    # Admin accounts must be created directly via DB or a seeded script.
    if body.role == UserRole.admin:
        raise HTTPException(
            status_code=403,
            detail="Admin accounts cannot be created via self-registration.",
        )

    user = User(
        email=body.email,
        username=body.username,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role,
        # Mentors need admin approval before they can publish courses
        is_approved=body.role != UserRole.mentor,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    # If 2FA is enabled, return a partial response — client must complete second step
    if user.is_2fa_enabled:
        # Issue a short-lived pre-auth access token (no role, no refresh) for the 2FA step
        pre_auth_token = create_access_token(user.id, "pre_auth")
        return TokenResponse(access_token=pre_auth_token, requires_2fa=True)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    # Store refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth/refresh",
    )
    return TokenResponse(access_token=access_token)


# ── Admin-only Login ─────────────────────────────────────────────────────────

@router.post("/admin-login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def admin_login(
    request: Request,
    body: AdminLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Dedicated login endpoint for admin accounts.
    Requires valid email + password **and** the correct ADMIN_SECRET.
    Defense-in-depth: even if someone guesses credentials they cannot
    obtain an admin token without also knowing the secret key.
    """
    # 1. Verify admin secret first — fail fast with a generic error
    #    so as not to reveal whether the email even exists.
    if body.admin_secret.get_secret_value() != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 2. Verify email + password
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 3. Verify the account is actually an admin in the DB
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Invalid credentials")

    # 4. Verify the account is active
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    # 5. Handle 2FA — return partial token if enabled
    if user.is_2fa_enabled:
        pre_auth_token = create_access_token(user.id, "pre_auth")
        return TokenResponse(access_token=pre_auth_token, requires_2fa=True)

    # 6. Issue full tokens
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth/refresh",
    )
    return TokenResponse(access_token=access_token)


@router.post("/2fa/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def two_fa_login(
    request: Request,
    body: TwoFALoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Second step of login for users who have 2FA enabled."""
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()
    if not user or not user.is_2fa_enabled or not user.totp_secret:
        raise HTTPException(status_code=401, detail="Invalid 2FA request")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Invalid or expired 2FA code")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth/refresh",
    )
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(access_token=create_access_token(user.id, user.role))


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
):
    # Clear the refresh cookie — access token expires naturally (15 min TTL)
    response.delete_cookie(key="refresh_token", path="/api/v1/auth/refresh")


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── 2FA Management ───────────────────────────────────────────────────────────

@router.post("/2fa/enable", response_model=TwoFASetupResponse)
async def enable_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a fresh TOTP secret and QR code for the user.
    The user must verify with a code before 2FA is actually activated.
    """
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name=settings.TOTP_ISSUER)
    qr_b64 = _generate_qr_b64(uri)

    # Persist the (unconfirmed) secret — will be fully enabled after /2fa/verify
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.totp_secret = secret
    db.add(user)
    await db.commit()

    return TwoFASetupResponse(secret=secret, qr_code_uri=uri, qr_code_image_b64=qr_b64)


@router.post("/2fa/verify", status_code=200)
async def verify_2fa(
    body: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a TOTP code against the stored secret.
    Activates 2FA on the account if valid.
    """
    # Re-fetch user to get totp_secret written by /2fa/enable in a previous request
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Call /2fa/enable first to generate a secret")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    user.is_2fa_enabled = True
    db.add(user)
    await db.commit()
    return {"message": "2FA successfully enabled", "is_2fa_enabled": True}


@router.post("/2fa/disable", status_code=200)
async def disable_2fa(
    body: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disable 2FA — requires a valid current TOTP code to confirm identity."""
    if not current_user.is_2fa_enabled or not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not enabled on this account")

    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.is_2fa_enabled = False
    user.totp_secret = None
    db.add(user)
    await db.commit()
    return {"message": "2FA disabled", "is_2fa_enabled": False}
