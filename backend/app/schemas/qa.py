"""
Q&A schemas — requests and responses for /qa endpoints and WebSockets.
"""
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Literal, Optional
from datetime import datetime


# ── Q&A Requests ──────────────────────────────────────────────────────────────

class QAMessageCreate(BaseModel):
    body: str
    parent_id: Optional[int] = None


# ── Q&A Responses ─────────────────────────────────────────────────────────────

class QAMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    author_id: int
    parent_id: Optional[int]
    body: str
    is_pinned: bool
    upvotes: int
    created_at: datetime


# ── WebSocket frames ──────────────────────────────────────────────────────────

class QAClientFrame(BaseModel):
    """Incoming WebSocket message from a connected client."""

    body: str
    parent_id: Optional[int] = None

    @field_validator("body")
    @classmethod
    def body_not_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("body must not be empty")
        return stripped


class QAEventFrame(BaseModel):
    """Outgoing WebSocket event broadcast to all clients in a course room."""

    event: Literal["message"] = "message"
    data: QAMessageOut
