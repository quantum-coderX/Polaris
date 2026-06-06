"""
Enrollment tests — free course enrollment, paid course guard, progress tracking.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from tests.conftest import _create_user, _get_token, auth_headers
from app.models.user import UserRole
from app.models.course import Course, CourseStatus


COURSE_BASE = {
    "title": "Free Enrollment Test Course",
    "description": "For enrollment tests",
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

PAID_COURSE_BASE = {**COURSE_BASE, "title": "Paid Enrollment Course", "price": 29.99, "is_free": False}


async def _publish_course(db_session, course_id: int):
    result = await db_session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()
    course.status = CourseStatus.published
    await db_session.commit()


@pytest.mark.asyncio
async def test_enroll_free_course(client: AsyncClient, db_session):
    await _create_user(db_session, "mentor_enroll@test.com", "mentor_enroll",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_enroll@test.com")
    course_resp = await client.post("/api/v1/courses/", json=COURSE_BASE, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    await _publish_course(db_session, course_id)

    await _create_user(db_session, "student_enroll@test.com", "student_enroll")
    student_token = await _get_token(client, "student_enroll@test.com")
    resp = await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(student_token))
    assert resp.status_code == 201
    assert resp.json()["course_id"] == course_id


@pytest.mark.asyncio
async def test_block_paid_course_direct_enrollment(client: AsyncClient, db_session):
    await _create_user(db_session, "mentor_paid@test.com", "mentor_paid",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_paid@test.com")
    course_resp = await client.post("/api/v1/courses/", json=PAID_COURSE_BASE, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    await _publish_course(db_session, course_id)

    await _create_user(db_session, "student_paid@test.com", "student_paid")
    student_token = await _get_token(client, "student_paid@test.com")
    resp = await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(student_token))
    assert resp.status_code == 400
    assert "paid course" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_duplicate_enrollment_rejected(client: AsyncClient, db_session):
    await _create_user(db_session, "mentor_dup_enroll@test.com", "mentor_dup_enroll",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_dup_enroll@test.com")
    course_resp = await client.post("/api/v1/courses/", json=COURSE_BASE, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    await _publish_course(db_session, course_id)

    await _create_user(db_session, "student_dup@test.com", "student_dup")
    student_token = await _get_token(client, "student_dup@test.com")
    await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(student_token))
    resp = await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(student_token))
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_my_enrollments(client: AsyncClient, db_session):
    await _create_user(db_session, "mentor_my_enroll@test.com", "mentor_my_enroll",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_my_enroll@test.com")
    course_resp = await client.post("/api/v1/courses/", json=COURSE_BASE, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    await _publish_course(db_session, course_id)

    await _create_user(db_session, "student_mylist@test.com", "student_mylist")
    student_token = await _get_token(client, "student_mylist@test.com")
    await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(student_token))
    resp = await client.get("/api/v1/enrollments/my", headers=auth_headers(student_token))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
