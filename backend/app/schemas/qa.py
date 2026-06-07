"""
Q&A schemas — requests and responses for /qa endpoints and WebSockets.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
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
