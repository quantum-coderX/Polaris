from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, Float
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import csv
import io

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User, UserRole
from app.models.course import Course, CourseStatus
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.payment import Payment, PaymentStatus
from app.models.review import Review, get_weighted_rating_expression

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
            Review.course_id.in_(course_ids),
            Review.is_approved == True,
        )
    )).scalar() or 0.0

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


# ---- Reports Export --------------------------------------------------------

@router.get("/reports/export")
async def export_report(
    type: str = Query("enrollments", description="Report type: users | enrollments | revenue"),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Export platform data as CSV download.
    Supported types: users, enrollments, revenue
    """
    output = io.StringIO()

    if type == "users":
        writer = csv.writer(output)
        writer.writerow(["ID", "Full Name", "Email", "Username", "Role", "Active", "Approved", "Created At"])
        result = await db.execute(select(User).order_by(User.created_at.desc()))
        for u in result.scalars().all():
            writer.writerow([
                u.id, u.full_name, u.email, u.username,
                u.role.value, u.is_active, u.is_approved,
                u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "",
            ])
        filename = "polaris_users.csv"

    elif type == "enrollments":
        writer = csv.writer(output)
        writer.writerow(["Enrollment ID", "Student ID", "Course ID", "Status", "Progress %", "Enrolled At", "Completed At"])
        result = await db.execute(select(Enrollment).order_by(Enrollment.id.desc()))
        for e in result.scalars().all():
            writer.writerow([
                e.id, e.student_id, e.course_id,
                e.status.value, e.progress_percent,
                e.enrolled_at.strftime("%Y-%m-%d %H:%M") if e.enrolled_at else "",
                e.completed_at.strftime("%Y-%m-%d %H:%M") if e.completed_at else "",
            ])
        filename = "polaris_enrollments.csv"

    elif type == "revenue":
        writer = csv.writer(output)
        writer.writerow(["Payment ID", "Student ID", "Course ID", "Provider", "Amount", "Currency", "Status", "Created At", "Refunded At"])
        result = await db.execute(select(Payment).order_by(Payment.id.desc()))
        for p in result.scalars().all():
            writer.writerow([
                p.id, p.student_id, p.course_id,
                p.provider.value, float(p.amount), p.currency,
                p.status.value,
                p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else "",
                p.refunded_at.strftime("%Y-%m-%d %H:%M") if p.refunded_at else "",
            ])
        filename = "polaris_revenue.csv"

    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid report type. Use: users | enrollments | revenue")

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ---- Payments Management ---------------------------------------------------

@router.get("/payments")
async def list_payments(
    status: PaymentStatus | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all payments with optional status filter."""
    stmt = select(Payment)
    if status:
        stmt = stmt.where(Payment.status == status)
    stmt = stmt.order_by(Payment.id.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    payments = result.scalars().all()

    total = (await db.execute(
        select(func.count(Payment.id)).where(Payment.status == PaymentStatus.completed)
    )).scalar()
    total_revenue = (await db.execute(
        select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.completed)
    )).scalar() or 0

    return {
        "payments": [
            {
                "id": p.id,
                "student_id": p.student_id,
                "course_id": p.course_id,
                "provider": p.provider.value,
                "amount": float(p.amount),
                "currency": p.currency,
                "status": p.status.value,
                "provider_payment_id": p.provider_payment_id,
                "enrollment_id": p.enrollment_id,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "refunded_at": p.refunded_at.isoformat() if p.refunded_at else None,
                "refund_reason": p.refund_reason,
            }
            for p in payments
        ],
        "total_completed": total,
        "total_revenue": float(total_revenue),
    }

