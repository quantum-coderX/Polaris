"""
Certificate endpoint tests — generation, progress validation, mock storage, public verification.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from tests.conftest import _create_user, _get_token, auth_headers
from app.models.user import UserRole
from app.models.course import Course, CourseStatus
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.lesson import Lesson


COURSE_BASE = {
    "title": "Certificate Course",
    "description": "For certificate tests",
    "short_description": "Short",
    "price": 0.0,
    "currency": "USD",
    "level": "beginner",
    "language": "English",
    "tags": "",
    "requirements": "",
    "what_you_learn": "",
    "is_free": True,
}


async def _publish_course(db_session, course_id: int):
    result = await db_session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()
    course.status = CourseStatus.published
    await db_session.commit()


@pytest.mark.asyncio
async def test_generate_certificate_incomplete_course(client: AsyncClient, db_session):
    # Setup mentor and course
    await _create_user(db_session, "mentor_cert@test.com", "mentor_cert",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_cert@test.com")
    course_resp = await client.post("/api/v1/courses/", json=COURSE_BASE, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    await _publish_course(db_session, course_id)

    # Setup student and enroll
    await _create_user(db_session, "student_cert@test.com", "student_cert")
    student_token = await _get_token(client, "student_cert@test.com")
    await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(student_token))

    # Try generating certificate when progress_percent = 0
    resp = await client.post(f"/api/v1/certificates/{course_id}", headers=auth_headers(student_token))
    assert resp.status_code == 400
    assert "not yet complete" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_generate_and_verify_certificate(client: AsyncClient, db_session):
    # Setup mentor and course
    await _create_user(db_session, "mentor_cert2@test.com", "mentor_cert2",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_cert2@test.com")
    course_resp = await client.post("/api/v1/courses/", json=COURSE_BASE, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    await _publish_course(db_session, course_id)

    # Setup student, enroll, and mark 100% progress
    student = await _create_user(db_session, "student_cert2@test.com", "student_cert2")
    student_token = await _get_token(client, "student_cert2@test.com")
    enroll_resp = await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(student_token))
    
    # Manually update enrollment progress to 100%
    result = await db_session.execute(
        select(Enrollment).where(
            Enrollment.student_id == student.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = result.scalar_one()
    enrollment.progress_percent = 100.0
    await db_session.commit()

    # Generate certificate (should succeed and trigger S3 mock storage)
    resp = await client.post(f"/api/v1/certificates/{course_id}", headers=auth_headers(student_token))
    assert resp.status_code == 201
    data = resp.json()
    assert "certificate_url" in data
    assert "certificate_id" in data
    assert "download_url" in data
    
    certificate_id = data["certificate_id"]

    # Verify certificate publicly (no auth)
    verify_resp = await client.get(f"/api/v1/certificates/verify/{certificate_id}")
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["valid"] is True
    assert verify_data["certificate_id"] == certificate_id
    assert verify_data["student_name"] == student.full_name
    assert verify_data["course_title"] == COURSE_BASE["title"]


@pytest.mark.asyncio
async def test_verify_invalid_certificate(client: AsyncClient, db_session):
    resp = await client.get("/api/v1/certificates/verify/invalid-uuid-string")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()
