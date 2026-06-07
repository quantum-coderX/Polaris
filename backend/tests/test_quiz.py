"""
Quiz endpoint tests — create quiz, add questions, submit answers, scoring.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from tests.conftest import _create_user, _get_token, auth_headers
from app.models.user import UserRole
from app.models.course import Course, CourseStatus
from app.models.lesson import Lesson
from app.models.course import Module


async def _setup_lesson(client, db_session) -> tuple[int, str, str]:
    """Create mentor, course, module, lesson. Return lesson_id, mentor_token, student_token."""
    await _create_user(db_session, "mentor_quiz@test.com", "mentor_quiz",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_quiz@test.com")

    course_resp = await client.post("/api/v1/courses/", json={
        "title": "Quiz Test Course",
        "description": "desc", "short_description": "short",
        "price": 0.0, "currency": "USD", "level": "beginner",
        "language": "English", "tags": "", "requirements": "", "what_you_learn": "", "is_free": True,
    }, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]

    mod_resp = await client.post(f"/api/v1/courses/{course_id}/modules",
                                  json={"title": "Module A", "order": 0},
                                  headers=auth_headers(mentor_token))
    module_id = mod_resp.json()["id"]

    lesson = Lesson(module_id=module_id, title="Lesson with Quiz",
                    lesson_type="video", is_published=True, order=0)
    db_session.add(lesson)
    await db_session.commit()
    await db_session.refresh(lesson)

    await _create_user(db_session, "student_quiz@test.com", "student_quiz")
    student_token = await _get_token(client, "student_quiz@test.com")

    return lesson.id, mentor_token, student_token


@pytest.mark.asyncio
async def test_create_quiz(client: AsyncClient, db_session):
    lesson_id, mentor_token, _ = await _setup_lesson(client, db_session)
    resp = await client.post("/api/v1/quizzes/", json={
        "lesson_id": lesson_id,
        "title": "Python Basics Quiz",
        "pass_score": 70.0,
    }, headers=auth_headers(mentor_token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Python Basics Quiz"
    assert data["pass_score"] == 70.0


@pytest.mark.asyncio
async def test_duplicate_quiz_blocked(client: AsyncClient, db_session):
    await _create_user(db_session, "mentor_dupquiz@test.com", "mentor_dupquiz",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_dupquiz@test.com")
    course_resp = await client.post("/api/v1/courses/", json={
        "title": "Dup Quiz Course", "description": "d", "short_description": "s",
        "price": 0.0, "currency": "USD", "level": "beginner",
        "language": "English", "tags": "", "requirements": "", "what_you_learn": "", "is_free": True,
    }, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    mod_resp = await client.post(f"/api/v1/courses/{course_id}/modules",
                                  json={"title": "Module B", "order": 0},
                                  headers=auth_headers(mentor_token))
    module_id = mod_resp.json()["id"]
    lesson = Lesson(module_id=module_id, title="Dup Lesson", lesson_type="video", is_published=True, order=0)
    db_session.add(lesson)
    await db_session.commit()
    await db_session.refresh(lesson)

    await client.post("/api/v1/quizzes/", json={"lesson_id": lesson.id, "title": "Q1", "pass_score": 70.0},
                       headers=auth_headers(mentor_token))
    resp2 = await client.post("/api/v1/quizzes/", json={"lesson_id": lesson.id, "title": "Q2", "pass_score": 70.0},
                               headers=auth_headers(mentor_token))
    assert resp2.status_code == 409


@pytest.mark.asyncio
async def test_add_question_and_submit(client: AsyncClient, db_session):
    lesson_id, mentor_token, student_token = await _setup_lesson(client, db_session)
    quiz_resp = await client.post("/api/v1/quizzes/", json={
        "lesson_id": lesson_id, "title": "MCQ Quiz", "pass_score": 50.0,
    }, headers=auth_headers(mentor_token))
    quiz_id = quiz_resp.json()["id"]

    # Add 2 questions
    q1 = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
        "question_text": "What is 2+2?",
        "question_type": "multiple_choice",
        "options": ["3", "4", "5", "6"],
        "correct_answer": "1",  # index 1 = "4"
        "order": 0,
    }, headers=auth_headers(mentor_token))
    q2 = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
        "question_text": "Python is interpreted?",
        "question_type": "true_false",
        "correct_answer": "true",
        "order": 1,
    }, headers=auth_headers(mentor_token))
    q1_id = q1.json()["id"]
    q2_id = q2.json()["id"]

    # Submit: 1 correct, 1 wrong → score = 50%
    submit_resp = await client.post(f"/api/v1/quizzes/{quiz_id}/submit", json={
        "answers": {str(q1_id): "1", str(q2_id): "false"},  # q2 wrong
    }, headers=auth_headers(student_token))
    assert submit_resp.status_code == 200
    result = submit_resp.json()
    assert result["score"] == 50.0
    assert result["passed"] is True   # 50 >= pass_score 50
    assert result["correct_count"] == 1
    assert len(result["feedback"]) == 2


@pytest.mark.asyncio
async def test_submit_all_correct_passes(client: AsyncClient, db_session):
    await _create_user(db_session, "mentor_allcorrect@test.com", "mentor_allcorrect",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_allcorrect@test.com")
    course_resp = await client.post("/api/v1/courses/", json={
        "title": "All Correct Course", "description": "d", "short_description": "s",
        "price": 0.0, "currency": "USD", "level": "beginner",
        "language": "English", "tags": "", "requirements": "", "what_you_learn": "", "is_free": True,
    }, headers=auth_headers(mentor_token))
    mod_resp = await client.post(f"/api/v1/courses/{course_resp.json()['id']}/modules",
                                  json={"title": "Mod", "order": 0}, headers=auth_headers(mentor_token))
    lesson = Lesson(module_id=mod_resp.json()["id"], title="Lsn", lesson_type="video",
                    is_published=True, order=0)
    db_session.add(lesson)
    await db_session.commit()
    await db_session.refresh(lesson)

    quiz_resp = await client.post("/api/v1/quizzes/", json={"lesson_id": lesson.id,
                                                              "title": "Perfect Quiz", "pass_score": 80.0},
                                   headers=auth_headers(mentor_token))
    quiz_id = quiz_resp.json()["id"]
    q = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
        "question_text": "Capital of France?",
        "question_type": "multiple_choice",
        "options": ["Berlin", "Paris", "Rome"],
        "correct_answer": "1",
        "order": 0,
    }, headers=auth_headers(mentor_token))

    await _create_user(db_session, "student_perfect@test.com", "student_perfect")
    student_token = await _get_token(client, "student_perfect@test.com")
    resp = await client.post(f"/api/v1/quizzes/{quiz_id}/submit",
                              json={"answers": {str(q.json()["id"]): "1"}},
                              headers=auth_headers(student_token))
    assert resp.status_code == 200
    assert resp.json()["score"] == 100.0
    assert resp.json()["passed"] is True
