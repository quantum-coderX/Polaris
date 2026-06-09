"""
Course & Module schemas — requests and responses for /courses and /modules endpoints.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.course import CourseLevel, CourseStatus


# ── Course Requests ───────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    title: str
    description: str
    short_description: str
    price: float = 0.0
    currency: str = "USD"
    level: CourseLevel = CourseLevel.beginner
    language: str = "English"
    tags: str = ""
    requirements: str = ""
    what_you_learn: str = ""
    is_free: bool = False


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    price: Optional[float] = None
    level: Optional[CourseLevel] = None
    language: Optional[str] = None
    tags: Optional[str] = None
    requirements: Optional[str] = None
    what_you_learn: Optional[str] = None
    thumbnail_url: Optional[str] = None
    promo_video_url: Optional[str] = None


# ── Course Responses ──────────────────────────────────────────────────────────

class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    short_description: str
    thumbnail_url: Optional[str]
    promo_video_url: Optional[str]
    price: float
    currency: str
    level: CourseLevel
    language: str
    status: CourseStatus
    tags: Optional[str]
    requirements: Optional[str]
    what_you_learn: Optional[str]
    total_duration_minutes: int
    total_lessons: int
    is_free: bool
    mentor_id: int
    created_at: datetime
    updated_at: datetime


class CourseListOut(BaseModel):
    """Lighter shape for list/search views — omits large text fields."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    short_description: str
    thumbnail_url: Optional[str]
    price: float
    currency: str
    level: CourseLevel
    language: str
    status: CourseStatus
    tags: Optional[str]
    total_duration_minutes: int
    total_lessons: int
    is_free: bool
    mentor_id: int


# ── Module Requests ───────────────────────────────────────────────────────────

class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order: int = 0


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None


# ── Module Responses ──────────────────────────────────────────────────────────

from app.schemas.lesson import LessonOut

class ModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    description: Optional[str]
    order: int
    created_at: datetime
    lessons: list[LessonOut] = []


# ── Search Responses ──────────────────────────────────────────────────────────

class CourseSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    short_description: str
    thumbnail_url: Optional[str]
    price: float
    level: CourseLevel
    language: str
    tags: Optional[str]
    total_duration_minutes: int
    total_lessons: int
    is_free: bool
    mentor_id: int


class AutocompleteResult(BaseModel):
    suggestions: list[str]
