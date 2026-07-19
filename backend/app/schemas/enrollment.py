"""
Enrollment & LessonProgress schemas — requests and responses for /enrollments endpoints.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.enrollment import EnrollmentStatus


# ── Enrollment Requests ───────────────────────────────────────────────────────

class ProgressUpdate(BaseModel):
    lesson_id: int
    watch_time_seconds: int = 0
    is_completed: bool = False


# ── Enrollment Responses ──────────────────────────────────────────────────────

class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    course_id: int
    status: EnrollmentStatus
    progress_percent: float
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    certificate_url: Optional[str] = None
    # Denormalized course info — populated by the /my endpoint
    course_title: Optional[str] = None
    course_slug: Optional[str] = None
    course_thumbnail: Optional[str] = None



class LessonProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enrollment_id: int
    lesson_id: int
    is_completed: bool
    watch_time_seconds: int
    completed_at: Optional[datetime] = None
    last_accessed: datetime
