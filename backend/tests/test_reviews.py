"""
Tests for the weighted average rating logic, reviews stats, and search min_rating filtering.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from tests.conftest import _create_user, _get_token, auth_headers
from app.models.user import UserRole
from app.models.course import Course, CourseStatus
from app.models.enrollment import Enrollment, EnrollmentStatus

COURSE_PAYLOAD = {
    "title": "Weighted Ratings Test Course",
    "description": "Demonstrating completion-weighted rating decays",
    "short_description": "Weighted Ratings",
    "price": 0.0,
    "currency": "USD",
    "level": "beginner",
    "language": "English",
    "tags": "test,ratings",
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
async def test_weighted_rating_calculation_and_filtering(client: AsyncClient, db_session):
    # 1. Create a mentor and course
    await _create_user(db_session, "mentor_reviews@test.com", "mentor_reviews",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_reviews@test.com")
    course_resp = await client.post("/api/v1/courses/", json=COURSE_PAYLOAD, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    await _publish_course(db_session, course_id)

    # 2. Setup 4 students with different progress levels and review values
    # Student A: 100% progress -> weight 1.5, rating = 5
    await _create_user(db_session, "student_a@test.com", "student_a")
    token_a = await _get_token(client, "student_a@test.com")
    
    # Enroll student A
    await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(token_a))
    # Update progress and status
    result = await db_session.execute(select(Enrollment).where(Enrollment.course_id == course_id))
    enrollments = result.scalars().all()
    
    # We find student A enrollment and update it
    for e in enrollments:
        e.progress_percent = 100.0
        e.status = EnrollmentStatus.completed
    await db_session.commit()

    # Post Review A
    await client.post("/api/v1/reviews/", json={"course_id": course_id, "rating": 5, "body": "Great!"}, headers=auth_headers(token_a))

    # Student B: 75% progress -> weight 1.0, rating = 4
    await _create_user(db_session, "student_b@test.com", "student_b")
    token_b = await _get_token(client, "student_b@test.com")
    await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(token_b))
    
    # Refresh and find B enrollment
    result = await db_session.execute(
        select(Enrollment).join(Enrollment.student).where(Enrollment.course_id == course_id, Enrollment.student.has(email="student_b@test.com"))
    )
    enroll_b = result.scalar_one()
    enroll_b.progress_percent = 75.0
    await db_session.commit()
    
    # Post Review B
    await client.post("/api/v1/reviews/", json={"course_id": course_id, "rating": 4, "body": "Good"}, headers=auth_headers(token_b))

    # Student C: 10% progress -> weight 0.5, rating = 2
    await _create_user(db_session, "student_c@test.com", "student_c")
    token_c = await _get_token(client, "student_c@test.com")
    await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(token_c))
    
    result = await db_session.execute(
        select(Enrollment).join(Enrollment.student).where(Enrollment.course_id == course_id, Enrollment.student.has(email="student_c@test.com"))
    )
    enroll_c = result.scalar_one()
    enroll_c.progress_percent = 10.0
    await db_session.commit()
    
    # Post Review C
    await client.post("/api/v1/reviews/", json={"course_id": course_id, "rating": 2, "body": "Meh"}, headers=auth_headers(token_c))

    # Student D: Refunded -> weight 0.0 (excluded), rating = 1
    await _create_user(db_session, "student_d@test.com", "student_d")
    token_d = await _get_token(client, "student_d@test.com")
    await client.post(f"/api/v1/enrollments/{course_id}", headers=auth_headers(token_d))
    
    result = await db_session.execute(
        select(Enrollment).join(Enrollment.student).where(Enrollment.course_id == course_id, Enrollment.student.has(email="student_d@test.com"))
    )
    enroll_d = result.scalar_one()
    enroll_d.status = EnrollmentStatus.refunded
    await db_session.commit()
    
    # Post Review D
    # Note: create_review endpoint requires enrollment.status to be active/completed, so we have to post it while active and then change status to refunded afterwards.
    # So we change status to active, post review, then change status to refunded.
    enroll_d.status = EnrollmentStatus.active
    await db_session.commit()
    await client.post("/api/v1/reviews/", json={"course_id": course_id, "rating": 1, "body": "Horrible"}, headers=auth_headers(token_d))
    
    enroll_d.status = EnrollmentStatus.refunded
    await db_session.commit()

    # 3. Fetch rating stats and assert weighted rating
    # Expected weighted rating = (5*1.5 + 4*1.0 + 2*0.5) / (1.5 + 1.0 + 0.5) = 12.5 / 3.0 = 4.17
    # Note: Student D review has weight 0.0, so it is ignored.
    stats_resp = await client.get(f"/api/v1/reviews/course/{course_id}/stats")
    assert stats_resp.status_code == 200
    data = stats_resp.json()
    assert data["average_rating"] == 4.17
    assert data["total_reviews"] == 4

    # 4. Assert single-course analytics endpoint returns weighted average
    analytics_resp = await client.get(f"/api/v1/courses/{course_id}/analytics", headers=auth_headers(mentor_token))
    assert analytics_resp.status_code == 200
    assert analytics_resp.json()["average_rating"] == 4.17

    # 5. Search filtering by min_rating
    # Course with rating 4.17 should be found if min_rating = 4.0
    search_resp1 = await client.get("/api/v1/search/courses?min_rating=4.0")
    assert search_resp1.status_code == 200
    results1 = search_resp1.json()
    assert len(results1) > 0
    assert any(r["id"] == course_id for r in results1)

    # Course with rating 4.17 should NOT be found if min_rating = 4.5
    search_resp2 = await client.get("/api/v1/search/courses?min_rating=4.5")
    assert search_resp2.status_code == 200
    results2 = search_resp2.json()
    assert not any(r["id"] == course_id for r in results2)
