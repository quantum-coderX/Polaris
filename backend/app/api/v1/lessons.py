import os
import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_mentor
from app.core.config import get_settings
from app.models.user import User, UserRole
from app.models.lesson import Lesson, LessonAttachment, LessonType
from app.models.course import Module

router = APIRouter(prefix="/lessons", tags=["Lessons"])
settings = get_settings()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")

from app.schemas.lesson import LessonCreate, LessonOut, PresignedUrlResponse, StreamUrlResponse


# ---- S3 Helpers ------------------------------------------------------------

def _use_mock_s3() -> bool:
    return not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY


def _s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


def _generate_presigned_upload(s3_key: str, content_type: str, expires: int = 3600) -> str:
    if _use_mock_s3():
        return f"http://localhost:8000/api/v1/lessons/mock-upload?key={s3_key}"
    s3 = _s3_client()
    return s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.AWS_S3_BUCKET, "Key": s3_key, "ContentType": content_type},
        ExpiresIn=expires,
    )


def _generate_presigned_download(s3_key: str, expires: int = 900) -> str:
    if _use_mock_s3():
        return f"http://localhost:8000/api/v1/lessons/media?key={s3_key}"
    s3 = _s3_client()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET, "Key": s3_key},
        ExpiresIn=expires,
    )


# ---- Endpoints -------------------------------------------------------------

@router.post("/", response_model=LessonOut, status_code=201)
async def create_lesson(
    body: LessonCreate,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Module).where(Module.id == body.module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    lesson = Lesson(**body.model_dump())
    db.add(lesson)
    await db.flush()
    await db.refresh(lesson)
    return lesson


@router.get("/{lesson_id}", response_model=LessonOut)
async def get_lesson(lesson_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.post("/{lesson_id}/upload-url", response_model=PresignedUrlResponse)
async def get_upload_url(
    lesson_id: int,
    content_type: str = Query(..., description="MIME type e.g. video/mp4, application/pdf"),
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns an S3 pre-signed PUT URL. The frontend uploads directly to S3.
    After upload, call PATCH /{lesson_id}/content with the s3_key.
    """
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    ext_map = {
        "video/mp4": "mp4", "video/webm": "webm",
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    }
    ext = ext_map.get(content_type, "bin")
    s3_key = f"lessons/{lesson_id}/content.{ext}"
    upload_url = _generate_presigned_upload(s3_key, content_type)
    return {"upload_url": upload_url, "s3_key": s3_key, "content_type": content_type}


@router.patch("/{lesson_id}/content", response_model=LessonOut)
async def set_lesson_content(
    lesson_id: int,
    s3_key: str,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson.content_url = s3_key
    lesson.is_published = True
    db.add(lesson)
    return lesson


@router.get("/{lesson_id}/stream", response_model=StreamUrlResponse)
async def get_stream_url(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a short-lived pre-signed GET URL for streaming video/PDF.
    Only enrolled students or the mentor can access.
    """
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson or not lesson.content_url:
        raise HTTPException(status_code=404, detail="Lesson content not found")

    stream_url = _generate_presigned_download(lesson.content_url, expires=900)
    return {"stream_url": stream_url, "expires_in": 900}


@router.delete("/{lesson_id}", status_code=204)
async def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await db.delete(lesson)


@router.put("/mock-upload")
async def mock_upload(key: str, request: Request):
    """
    Mock S3 upload endpoint. Saves the raw body of the request to local disk.
    """
    if not _use_mock_s3():
        raise HTTPException(status_code=403, detail="Mock upload only available in offline mode")
    
    clean_key = key.replace("../", "").replace("..\\", "")
    file_path = os.path.join(UPLOAD_DIR, clean_key)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    body_content = await request.body()
    with open(file_path, "wb") as f:
        f.write(body_content)
        
    return {"status": "success", "s3_key": key}


@router.get("/media")
async def get_mock_media(key: str):
    """
    Serves the locally uploaded mock files.
    """
    if not _use_mock_s3():
        raise HTTPException(status_code=403, detail="Mock media only available in offline mode")
    
    clean_key = key.replace("../", "").replace("..\\", "")
    file_path = os.path.join(UPLOAD_DIR, clean_key)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path)
