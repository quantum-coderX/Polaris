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
    # Ensure slug uniqueness
    result = await db.execute(select(Course).where(Course.slug.like(f"{slug}%")))
    existing = result.scalars().all()
    if existing:
        slug = f"{slug}-{len(existing)}"

    course = Course(**body.model_dump(), slug=slug, mentor_id=current_user.id)
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Course).where(Course.id == course_id))
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
    await db.refresh(module)
    return module


@router.get("/{course_id}/modules", response_model=list[ModuleOut])
async def list_modules(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Module).where(Module.course_id == course_id).order_by(Module.order))
    return result.scalars().all()
