from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.review import Review
from app.models.enrollment import Enrollment, EnrollmentStatus

router = APIRouter(prefix="/reviews", tags=["Reviews"])


from app.schemas.review import ReviewCreate, ReviewOut, ReviewReport


@router.post("/", response_model=ReviewOut, status_code=201)
async def create_review(
    body: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not 1 <= body.rating <= 5:
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5")

    # Must be enrolled and completed/active
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == body.course_id,
            Enrollment.status.in_([EnrollmentStatus.active, EnrollmentStatus.completed]),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="You must be enrolled to review this course")

    # One review per student per course
    result = await db.execute(
        select(Review).where(
            Review.student_id == current_user.id,
            Review.course_id == body.course_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already reviewed this course")

    review = Review(student_id=current_user.id, **body.model_dump())
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return review


@router.get("/course/{course_id}", response_model=list[ReviewOut])
async def get_course_reviews(
    course_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Review).where(
            Review.course_id == course_id,
            Review.is_approved == True,
        ).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/course/{course_id}/stats")
async def get_course_rating_stats(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.course_id == course_id,
            Review.is_approved == True,
        )
    )
    avg_rating, total = result.one()
    return {
        "average_rating": round(float(avg_rating or 0), 2),
        "total_reviews": total,
    }


@router.post("/{review_id}/report", status_code=200)
async def report_review(
    review_id: int,
    body: ReviewReport,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_reported = True
    review.report_reason = body.reason
    db.add(review)
    return {"status": "reported"}


@router.patch("/{review_id}/moderate", response_model=ReviewOut)
async def moderate_review(
    review_id: int,
    approve: bool,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_approved = approve
    review.is_reported = False
    db.add(review)
    return review


@router.delete("/{review_id}", status_code=204)
async def delete_review(
    review_id: int,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.delete(review)
