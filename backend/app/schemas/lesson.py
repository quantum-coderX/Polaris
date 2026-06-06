"""
Lesson & Attachment schemas — requests and responses for /lessons endpoints.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.lesson import LessonType


# ── Lesson Requests ──────────────────────────────────────────────────────────

class LessonCreate(BaseModel):
    module_id: int
    title: str
    description: Optional[str] = None
    lesson_type: LessonType = LessonType.video
    content_text: Optional[str] = None
    duration_minutes: int = 0
    order: int = 0
    is_preview: bool = False


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    lesson_type: Optional[LessonType] = None
    content_text: Optional[str] = None
    duration_minutes: Optional[int] = None
    order: Optional[int] = None
    is_preview: Optional[bool] = None
    is_published: Optional[bool] = None


# ── Lesson Responses ─────────────────────────────────────────────────────────

class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    module_id: int
    title: str
    description: Optional[str]
    lesson_type: LessonType
    duration_minutes: int
    order: int
    is_preview: bool
    is_published: bool
    content_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ── Attachment Schemas ────────────────────────────────────────────────────────

class LessonAttachmentCreate(BaseModel):
    file_name: str
    s3_key: str
    file_size_bytes: int
    content_type: str


class LessonAttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    file_name: str
    s3_key: str
    file_size_bytes: int
    content_type: str
    created_at: datetime


# ── Utility Responses ─────────────────────────────────────────────────────────

class PresignedUrlResponse(BaseModel):
    upload_url: str
    s3_key: str
    content_type: str


class StreamUrlResponse(BaseModel):
    stream_url: str
    expires_in: int
