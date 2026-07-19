from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, ConfigDict

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin, require_mentor
from app.models.user import User, UserRole
from app.models.course import Course, CourseStatus

router = APIRouter(prefix="/users", tags=["Users"])


from app.schemas.user import UserOut, UserUpdateRequest


@router.get("/", response_model=list[UserOut])
async def list_users(
    role: UserRole | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Return the currently authenticated user's profile."""
    return current_user


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.add(current_user)
    return current_user


@router.post("/{user_id}/approve", response_model=UserOut)
async def approve_mentor(
    user_id: int,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != UserRole.mentor:
        raise HTTPException(status_code=400, detail="User is not a mentor")
    user.is_approved = True
    db.add(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def deactivate_user(
    user_id: int,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.add(user)
