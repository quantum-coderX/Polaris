from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User, UserRole
from app.models.course import Course, CourseStatus
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.payment import Payment, PaymentStatus
from app.models.review import Review

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---- Dashboard Stats -------------------------------------------------------

@router.get("/stats")
async def dashboard_stats(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_students = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.student))).scalar()
    total_mentors = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.mentor))).scalar()
    total_courses = (await db.execute(select(func.count(Course.id)))).scalar()
    pending_courses = (await db.execute(
        select(func.count(Course.id)).where(Course.status == CourseStatus.pending)
    )).scalar()
    total_revenue = (await db.execute(
        select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.completed)
    )).scalar() or 0
    total_enrollments = (await db.execute(select(func.count(Enrollment.id)))).scalar()

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_mentors": total_mentors,
        "total_courses": total_courses,
        "pending_courses": pending_courses,
        "total_revenue": float(total_revenue),
        "total_enrollments": total_enrollments,
    }


# ---- Pending Content -------------------------------------------------------

@router.get("/courses/pending")
async def pending_courses(
    _admin: User = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Course).where(Course.status == CourseStatus.pending).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/reviews/reported")
async def reported_reviews(
    _admin: User = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Review).where(Review.is_reported == True).offset(skip).limit(limit)
    )
    return result.scalars().all()


# ---- Mentor Analytics ------------------------------------------------------

@router.get("/mentors/{mentor_id}/analytics")
async def mentor_analytics(
    mentor_id: int,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    courses_result = await db.execute(
        select(Course).where(Course.mentor_id == mentor_id, Course.status == CourseStatus.published)
    )
    courses = courses_result.scalars().all()
    course_ids = [c.id for c in courses]

    total_enrollments = (await db.execute(
        select(func.count(Enrollment.id)).where(Enrollment.course_id.in_(course_ids))
    )).scalar() or 0

    total_revenue = (await db.execute(
        select(func.sum(Payment.amount)).where(
            Payment.course_id.in_(course_ids),
            Payment.status == PaymentStatus.completed,
        )
    )).scalar() or 0

    avg_rating = (await db.execute(
        select(func.avg(Review.rating)).where(
            Review.course_id.in_(course_ids),
            Review.is_approved == True,
        )
    )).scalar() or 0

    return {
        "mentor_id": mentor_id,
        "published_courses": len(courses),
        "total_enrollments": total_enrollments,
        "total_revenue": float(total_revenue),
        "average_rating": round(float(avg_rating), 2),
        "courses": [{"id": c.id, "title": c.title, "status": c.status} for c in courses],
    }


# ---- Users Management ------------------------------------------------------

@router.get("/users/pending-mentors")
async def pending_mentors(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.role == UserRole.mentor, User.is_approved == False)
    )
    return result.scalars().all()


@router.get("/users")
async def list_all_users(
    role: UserRole | None = None,
    search: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: list all platform users with optional role / search filters."""
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            (User.full_name.ilike(pattern)) | (User.email.ilike(pattern)) | (User.username.ilike(pattern))
        )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar()
    stmt = stmt.order_by(User.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return {"users": users, "total": total}
