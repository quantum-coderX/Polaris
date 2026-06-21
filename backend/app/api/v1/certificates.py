"""
Certificate Generation API.

Flow:
  1. Student completes 100% of a course → POST /certificates/{course_id}
  2. Server generates a PDF via reportlab, uploads to S3
  3. S3 key stored in enrollment.certificate_url
  4. GET /certificates/{course_id}/verify → public verification (no auth)
"""
import io
import uuid
from datetime import datetime, timezone

import boto3
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from app.core.database import get_db
from app.core.deps import get_current_user, require_student
from app.core.config import get_settings
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment, EnrollmentStatus

router = APIRouter(prefix="/certificates", tags=["Certificates"])
settings = get_settings()


# ── PDF Builder ──────────────────────────────────────────────────────────────

def _build_certificate_pdf(
    student_name: str,
    course_title: str,
    mentor_name: str,
    completion_date: str,
    certificate_id: str,
    verify_url: str,
) -> bytes:
    """Generate a premium PDF certificate and return raw bytes."""
    buffer = io.BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=landscape(A4))

    # Background gradient simulation — dark navy
    c.setFillColor(HexColor("#0d0d1a"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Decorative border
    c.setStrokeColor(HexColor("#6c63ff"))
    c.setLineWidth(3)
    c.rect(1.5 * cm, 1.5 * cm, width - 3 * cm, height - 3 * cm, fill=0)

    c.setStrokeColor(HexColor("#a78bfa"))
    c.setLineWidth(1)
    c.rect(1.8 * cm, 1.8 * cm, width - 3.6 * cm, height - 3.6 * cm, fill=0)

    # Header — Polaris logo text
    c.setFillColor(HexColor("#6c63ff"))
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 3.5 * cm, "Polaris")

    c.setFillColor(HexColor("#a78bfa"))
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 4.4 * cm, "Certificate of Completion")

    # Divider
    c.setStrokeColor(HexColor("#6c63ff"))
    c.setLineWidth(1.5)
    c.line(width * 0.2, height - 5 * cm, width * 0.8, height - 5 * cm)

    # "This certifies that"
    c.setFillColor(HexColor("#94a3b8"))
    c.setFont("Helvetica", 13)
    c.drawCentredString(width / 2, height - 6.2 * cm, "This is to certify that")

    # Student name
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(width / 2, height - 8 * cm, student_name)

    c.setFillColor(HexColor("#94a3b8"))
    c.setFont("Helvetica", 13)
    c.drawCentredString(width / 2, height - 9.2 * cm, "has successfully completed the course")

    # Course title
    c.setFillColor(HexColor("#a78bfa"))
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 11 * cm, course_title)

    # Bottom row — date + mentor + cert ID
    c.setFillColor(HexColor("#64748b"))
    c.setFont("Helvetica", 10)
    c.drawString(3 * cm, 3.2 * cm, f"Completed: {completion_date}")
    c.drawCentredString(width / 2, 3.2 * cm, f"Instructor: {mentor_name}")
    c.drawRightString(width - 3 * cm, 3.2 * cm, f"Certificate ID: {certificate_id[:12].upper()}")

    # Verify URL
    c.setFillColor(HexColor("#6c63ff"))
    c.setFont("Helvetica", 9)
    c.drawCentredString(width / 2, 2.2 * cm, f"Verify at: {verify_url}")

    c.save()
    return buffer.getvalue()


import os
from app.api.v1.lessons import UPLOAD_DIR

def _use_mock_s3() -> bool:
    return not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY


def _upload_to_s3(pdf_bytes: bytes, s3_key: str) -> str:
    """Upload bytes to S3 and return the S3 key."""
    if _use_mock_s3():
        clean_key = s3_key.replace("../", "").replace("..\\", "")
        file_path = os.path.join(UPLOAD_DIR, clean_key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)
        return s3_key

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET,
        Key=s3_key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )
    return s3_key


def _get_presigned_url(s3_key: str) -> str:
    if _use_mock_s3():
        return f"http://localhost:8000/api/v1/lessons/media?key={s3_key}"
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET, "Key": s3_key},
        ExpiresIn=3600,
    )



from app.schemas.certificate import CertificateResponse


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/{course_id}", response_model=CertificateResponse, status_code=201)
async def generate_certificate(
    course_id: int,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate and store a PDF certificate for a completed course.
    Only callable when progress_percent == 100.
    """
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if enrollment.progress_percent < 100:
        raise HTTPException(
            status_code=400,
            detail=f"Course not yet complete ({enrollment.progress_percent:.0f}% done)"
        )

    # Return existing certificate if already generated
    if enrollment.certificate_url:
        download_url = _get_presigned_url(enrollment.certificate_url)
        cert_id = enrollment.certificate_url.split("/")[-1].replace(".pdf", "")
        return CertificateResponse(
            certificate_url=enrollment.certificate_url,
            certificate_id=cert_id,
            download_url=download_url,
        )

    # Load course + mentor info
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    mentor_result = await db.execute(select(User).where(User.id == course.mentor_id))
    mentor = mentor_result.scalar_one()

    # Generate unique certificate ID
    cert_id = str(uuid.uuid4())
    verify_url = f"{settings.FRONTEND_URL}/certificates/verify/{cert_id}"
    completion_date = (
        enrollment.completed_at.strftime("%B %d, %Y")
        if enrollment.completed_at
        else datetime.now(timezone.utc).strftime("%B %d, %Y")
    )

    # Build PDF
    pdf_bytes = _build_certificate_pdf(
        student_name=current_user.full_name,
        course_title=course.title,
        mentor_name=mentor.full_name,
        completion_date=completion_date,
        certificate_id=cert_id,
        verify_url=verify_url,
    )

    # Upload to S3
    s3_key = f"certificates/{current_user.id}/{course_id}/{cert_id}.pdf"
    _upload_to_s3(pdf_bytes, s3_key)

    # Persist S3 key in enrollment
    enrollment.certificate_url = s3_key
    db.add(enrollment)

    download_url = _get_presigned_url(s3_key)
    return CertificateResponse(
        certificate_url=s3_key,
        certificate_id=cert_id,
        download_url=download_url,
    )


@router.get("/verify/{certificate_id}")
async def verify_certificate(
    certificate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — verifies certificate authenticity by certificate_id substring.
    No auth required.
    """
    # Search for enrollment whose certificate_url contains this ID
    from sqlalchemy import text
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.certificate_url.ilike(f"%{certificate_id}%")
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Certificate not found or invalid")

    course_result = await db.execute(select(Course).where(Course.id == enrollment.course_id))
    course = course_result.scalar_one()

    student_result = await db.execute(select(User).where(User.id == enrollment.student_id))
    student = student_result.scalar_one()

    return {
        "valid": True,
        "certificate_id": certificate_id,
        "student_name": student.full_name,
        "course_title": course.title,
        "completed_at": enrollment.completed_at,
    }
