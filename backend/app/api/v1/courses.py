from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, ConfigDict
from typing import Optional
import re

from app.core.database import get_db
from app.core.deps import get_current_user, require_mentor, require_admin
from app.models.user import User, UserRole
from app.models.course import Course, Module, CourseLevel, CourseStatus

router = APIRouter(prefix="/courses", tags=["Courses"])


from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, ModuleCreate, ModuleOut


# ---- Helpers ---------------------------------------------------------------

def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


# ---- Course CRUD -----------------------------------------------------------

@router.get("/", response_model=list[CourseOut])
async def list_courses(
    level: Optional[CourseLevel] = None,
    language: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    is_free: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Course).where(Course.status == CourseStatus.published)
    if level:
        stmt = stmt.where(Course.level == level)
    if language:
        stmt = stmt.where(Course.language == language)
    if min_price is not None:
        stmt = stmt.where(Course.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Course.price <= max_price)
    if is_free is not None:
        stmt = stmt.where(Course.is_free == is_free)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=CourseOut, status_code=201)
async def create_course(
    body: CourseCreate,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.mentor and not current_user.is_approved:
        raise HTTPException(status_code=403, detail="Your mentor account is pending approval")

    slug = _slugify(body.title)
    # Ensure slug uniqueness across all courses
    result = await db.execute(select(Course).where(Course.slug.like(f"{slug}%")))
    existing = result.scalars().all()
    if existing:
        slug = f"{slug}-{len(existing) + 1}"

    course = Course(**body.model_dump(), slug=slug, mentor_id=current_user.id)
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return course


@router.get("/mine", response_model=list[CourseOut])
async def my_courses(
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    """Return all courses created by the currently authenticated mentor."""
    result = await db.execute(
        select(Course).where(Course.mentor_id == current_user.id).order_by(Course.id.desc())
    )
    return result.scalars().all()


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(course_id: str, db: AsyncSession = Depends(get_db)):
    """Look up a course by numeric ID or by URL slug."""
    # Try numeric ID first
    if course_id.isdigit():
        result = await db.execute(select(Course).where(Course.id == int(course_id)))
    else:
        result = await db.execute(select(Course).where(Course.slug == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    body: CourseUpdate,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.mentor_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your course")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(course, field, value)
    db.add(course)
    return course


@router.post("/{course_id}/submit", response_model=CourseOut)
async def submit_for_review(
    course_id: int,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course or course.mentor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Course not found")
    course.status = CourseStatus.pending
    db.add(course)
    return course


@router.post("/{course_id}/approve", response_model=CourseOut)
async def approve_course(
    course_id: int,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.status = CourseStatus.published
    db.add(course)
    return course


@router.post("/{course_id}/reject", response_model=CourseOut)
async def reject_course(
    course_id: int,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.status = CourseStatus.rejected
    db.add(course)
    return course


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: int,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.mentor_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your course")
    course.status = CourseStatus.archived
    db.add(course)


from sqlalchemy.orm import selectinload

# ---- Modules ---------------------------------------------------------------

@router.post("/{course_id}/modules", response_model=ModuleOut, status_code=201)
async def create_module(
    course_id: int,
    body: ModuleCreate,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course or (course.mentor_id != current_user.id and current_user.role != UserRole.admin):
        raise HTTPException(status_code=404, detail="Course not found")
    module = Module(course_id=course_id, **body.model_dump())
    db.add(module)
    await db.flush()
    res = await db.execute(
        select(Module)
        .where(Module.id == module.id)
        .options(selectinload(Module.lessons))
    )
    return res.scalar_one()


@router.get("/{course_id}/modules", response_model=list[ModuleOut])
async def list_modules(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Module)
        .where(Module.course_id == course_id)
        .options(selectinload(Module.lessons))
        .order_by(Module.order)
    )
    return result.scalars().all()


# ---- Per-Course Analytics (Mentor) -----------------------------------------

@router.get("/{course_id}/analytics")
async def course_analytics(
    course_id: int,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    """
    Return detailed analytics for a single course.
    Available to the owning mentor and admins.
    """
    from app.models.enrollment import Enrollment, EnrollmentStatus, LessonProgress
    from app.models.payment import Payment, PaymentStatus
    from app.models.review import Review, get_weighted_rating_expression

    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.mentor_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your course")

    total_enrollments = (await db.execute(
        select(func.count(Enrollment.id)).where(Enrollment.course_id == course_id)
    )).scalar() or 0

    active_enrollments = (await db.execute(
        select(func.count(Enrollment.id)).where(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.active,
        )
    )).scalar() or 0

    completed_enrollments = (await db.execute(
        select(func.count(Enrollment.id)).where(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.completed,
        )
    )).scalar() or 0

    total_revenue = (await db.execute(
        select(func.sum(Payment.amount)).where(
            Payment.course_id == course_id,
            Payment.status == PaymentStatus.completed,
        )
    )).scalar() or 0
    from sqlalchemy import and_, cast, Float, case
    dialect_name = db.bind.dialect.name
    weight_expr = get_weighted_rating_expression(dialect_name)

    avg_rating = (await db.execute(
        select(
            func.coalesce(func.sum(cast(Review.rating, Float) * weight_expr) / func.nullif(func.sum(weight_expr), 0), 0.0)
        )
        .join(
            Enrollment,
            and_(
                Enrollment.course_id == Review.course_id,
                Enrollment.student_id == Review.student_id
            )
        )
        .where(
            Review.course_id == course_id,
            Review.is_approved == True,
        )
    )).scalar() or 0.0

    total_reviews = (await db.execute(
        select(func.count(Review.id)).where(
            Review.course_id == course_id,
            Review.is_approved == True,
        )
    )).scalar() or 0

    avg_progress = (await db.execute(
        select(func.avg(Enrollment.progress_percent)).where(
            Enrollment.course_id == course_id,
        )
    )).scalar() or 0

    completion_rate = (completed_enrollments / total_enrollments * 100) if total_enrollments > 0 else 0

    return {
        "course_id": course_id,
        "course_title": course.title,
        "total_enrollments": total_enrollments,
        "active_enrollments": active_enrollments,
        "completed_enrollments": completed_enrollments,
        "completion_rate": round(completion_rate, 1),
        "average_progress": round(float(avg_progress), 1),
        "total_revenue": float(total_revenue),
        "average_rating": round(float(avg_rating), 2),
        "total_reviews": total_reviews,
    }

