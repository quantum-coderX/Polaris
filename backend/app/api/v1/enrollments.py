from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user, require_student
from app.models.user import User, UserRole
from app.models.course import Course, CourseStatus
from app.models.enrollment import Enrollment, LessonProgress, EnrollmentStatus
from app.models.lesson import Lesson
from app.models.payment import Payment, PaymentStatus

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


from app.schemas.enrollment import EnrollmentOut, ProgressUpdate


@router.post("/{course_id}", response_model=EnrollmentOut, status_code=201)
async def enroll(
    course_id: int,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Enroll in a free course directly. Paid courses must go through /payments/checkout."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course or course.status != CourseStatus.published:
        raise HTTPException(status_code=404, detail="Course not found or not published")
    if not course.is_free and course.price > 0:
        raise HTTPException(status_code=400, detail="This is a paid course. Use /payments/checkout to enroll.")

    # Check already enrolled
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Already enrolled")

    enrollment = Enrollment(student_id=current_user.id, course_id=course_id)
    db.add(enrollment)
    await db.flush()
    await db.refresh(enrollment)
    return enrollment


@router.get("/my", response_model=list[EnrollmentOut])
async def my_enrollments(
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == current_user.id,
            Enrollment.status == EnrollmentStatus.active,
        )
    )
    return result.scalars().all()


@router.get("/{course_id}", response_model=EnrollmentOut)
async def get_enrollment(
    course_id: int,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return enrollment


@router.post("/{course_id}/progress", status_code=200)
async def update_progress(
    course_id: int,
    body: ProgressUpdate,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Update lesson progress and recalculate overall course completion percentage."""
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment or enrollment.status != EnrollmentStatus.active:
        raise HTTPException(status_code=404, detail="Active enrollment not found")

    # Upsert lesson progress
    result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.lesson_id == body.lesson_id,
        )
    )
    lp = result.scalar_one_or_none()
    if not lp:
        lp = LessonProgress(enrollment_id=enrollment.id, lesson_id=body.lesson_id)

    lp.watch_time_seconds = max(lp.watch_time_seconds, body.watch_time_seconds)
    lp.is_completed = body.is_completed
    if body.is_completed and not lp.completed_at:
        lp.completed_at = datetime.now(timezone.utc)
    db.add(lp)
    await db.flush()

    # Recalculate overall progress
    # Get total lessons in course via modules
    from app.models.course import Module
    modules_result = await db.execute(select(Module).where(Module.course_id == course_id))
    module_ids = [m.id for m in modules_result.scalars().all()]

    total_result = await db.execute(
        select(Lesson).where(Lesson.module_id.in_(module_ids), Lesson.is_published == True)
    )
    total_lessons = len(total_result.scalars().all())

    completed_result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.is_completed == True,
        )
    )
    completed_count = len(completed_result.scalars().all())

    if total_lessons > 0:
        enrollment.progress_percent = round((completed_count / total_lessons) * 100, 2)

    if enrollment.progress_percent >= 100 and not enrollment.completed_at:
        enrollment.completed_at = datetime.now(timezone.utc)
        enrollment.status = EnrollmentStatus.completed

    db.add(enrollment)
    return {"progress_percent": enrollment.progress_percent, "completed": enrollment.status == EnrollmentStatus.completed}
