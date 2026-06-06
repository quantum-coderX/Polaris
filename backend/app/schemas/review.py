"""
Review schemas — requests and responses for /reviews endpoints.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


# ── Review Requests ───────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    course_id: int
    rating: int  # 1-5
    title: Optional[str] = None
    body: Optional[str] = None


class ReviewReport(BaseModel):
    reason: str


# ── Review Responses ──────────────────────────────────────────────────────────

class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    course_id: int
    rating: int
    title: Optional[str]
    body: Optional[str]
    is_approved: bool
    is_reported: bool
    created_at: datetime
