from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, ConfigDict
import boto3
import time

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin, require_mentor
from app.models.user import User, UserRole
from app.models.course import Course, CourseStatus
from app.core.config import get_settings

settings = get_settings()

def _use_mock_s3() -> bool:
    return not bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)

def _upload_avatar_to_s3(user_id: int, file: UploadFile) -> str:
    timestamp = int(time.time())
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    s3_key = f"users/{user_id}/avatar_{timestamp}.{ext}"
    
    file_bytes = file.file.read()
    
    if _use_mock_s3():
        # Just mock the URL based on the key
        return f"http://localhost:8000/api/v1/media?key={s3_key}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET,
        Key=s3_key,
        Body=file_bytes,
        ContentType=file.content_type or "image/jpeg",
        ACL="public-read"
    )
    
    return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"


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


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
        
    MAX_SIZE = 5 * 1024 * 1024 # 5MB
    if getattr(file, 'size', 0) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")
        
    # As a fallback if file.size is not populated by the client's Content-Length
    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")
        
    # Reset file cursor for boto3 since we read it
    await file.seek(0)
        
    avatar_url = _upload_avatar_to_s3(current_user.id, file)
    current_user.avatar_url = avatar_url
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
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
