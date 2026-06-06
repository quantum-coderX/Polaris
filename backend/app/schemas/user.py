"""
User schemas — profile responses and update payloads.
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


# ── Responses ────────────────────────────────────────────────────────────────

class UserPublicOut(BaseModel):
    """Safe public profile — no sensitive fields."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    avatar_url: Optional[str]
    bio: Optional[str]
    role: UserRole


class UserPrivateOut(BaseModel):
    """Full profile — for the authenticated user only."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    full_name: str
    role: UserRole
    avatar_url: Optional[str]
    bio: Optional[str]
    is_active: bool
    is_verified: bool
    is_2fa_enabled: bool
    created_at: datetime


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    username: str
    full_name: str
    role: UserRole
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    is_approved: bool = False


# ── Requests ─────────────────────────────────────────────────────────────────

class UserUpdateRequest(BaseModel):
    """PATCH /users/me — all fields optional."""
    full_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
