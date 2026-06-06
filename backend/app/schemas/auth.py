"""
Auth schemas — request bodies and response models for /auth endpoints.
"""
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


# ── Requests ─────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    role: UserRole = UserRole.student


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TwoFAVerifyRequest(BaseModel):
    """Used for both verify (enable) and disable 2FA — requires a live TOTP code."""
    code: str


class TwoFALoginRequest(BaseModel):
    """Second-step login body when 2FA is active."""
    email: EmailStr
    code: str


# ── Responses ────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_2fa: bool = False


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: UserRole
    avatar_url: str | None
    is_active: bool
    is_2fa_enabled: bool

    model_config = {"from_attributes": True}


class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code_uri: str           # otpauth:// URI for authenticator apps
    qr_code_image_b64: str     # base64-encoded PNG of QR code
