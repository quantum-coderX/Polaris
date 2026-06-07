"""
Courses endpoint tests — CRUD lifecycle, role enforcement, slug uniqueness.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import _create_user, _get_token, auth_headers
from app.models.user import UserRole


COURSE_PAYLOAD = {
    "title": "Python for Beginners",
    "description": "Learn Python from scratch",
    "short_description": "Beginner Python course",
    "price": 49.99,
    "currency": "USD",
    "level": "beginner",
    "language": "English",
    "tags": "python,programming",
    "requirements": "None",
    "what_you_learn": "Python basics",
    "is_free": False,
}


@pytest.mark.asyncio
async def test_student_cannot_create_course(client: AsyncClient, db_session):
    await _create_user(db_session, "student_nocourse@test.com", "student_nocourse")
    token = await _get_token(client, "student_nocourse@test.com")
    resp = await client.post("/api/v1/courses/", json=COURSE_PAYLOAD, headers=auth_headers(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_mentor_can_create_course(client: AsyncClient, db_session):
    mentor = await _create_user(
        db_session, "mentor_create@test.com", "mentor_create",
        role=UserRole.mentor, is_approved=True
    )
    token = await _get_token(client, "mentor_create@test.com")
    resp = await client.post("/api/v1/courses/", json=COURSE_PAYLOAD, headers=auth_headers(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Python for Beginners"
    assert "slug" in data
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_course_slug_uniqueness(client: AsyncClient, db_session):
    await _create_user(
        db_session, "mentor_slug@test.com", "mentor_slug",
        role=UserRole.mentor, is_approved=True
    )
    token = await _get_token(client, "mentor_slug@test.com")
    payload = {**COURSE_PAYLOAD, "title": "Same Title Course"}
    r1 = await client.post("/api/v1/courses/", json=payload, headers=auth_headers(token))
    r2 = await client.post("/api/v1/courses/", json=payload, headers=auth_headers(token))
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["slug"] != r2.json()["slug"]


@pytest.mark.asyncio
async def test_unapproved_mentor_blocked(client: AsyncClient, db_session):
    await _create_user(
        db_session, "unapproved_mentor@test.com", "unapproved_mentor",
        role=UserRole.mentor, is_approved=False
    )
    token = await _get_token(client, "unapproved_mentor@test.com")
    resp = await client.post("/api/v1/courses/", json=COURSE_PAYLOAD, headers=auth_headers(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_courses_public(client: AsyncClient):
    resp = await client.get("/api/v1/courses/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_course_update_by_owner(client: AsyncClient, db_session):
    await _create_user(
        db_session, "mentor_upd@test.com", "mentor_upd",
        role=UserRole.mentor, is_approved=True
    )
    token = await _get_token(client, "mentor_upd@test.com")
    create_resp = await client.post("/api/v1/courses/", json=COURSE_PAYLOAD, headers=auth_headers(token))
    course_id = create_resp.json()["id"]
    patch_resp = await client.patch(
        f"/api/v1/courses/{course_id}",
        json={"title": "Updated Python Course"},
        headers=auth_headers(token)
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["title"] == "Updated Python Course"


@pytest.mark.asyncio
async def test_course_submit_for_review(client: AsyncClient, db_session):
    await _create_user(
        db_session, "mentor_submit@test.com", "mentor_submit",
        role=UserRole.mentor, is_approved=True
    )
    token = await _get_token(client, "mentor_submit@test.com")
    create_resp = await client.post("/api/v1/courses/", json=COURSE_PAYLOAD, headers=auth_headers(token))
    course_id = create_resp.json()["id"]
    submit_resp = await client.post(f"/api/v1/courses/{course_id}/submit", headers=auth_headers(token))
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "pending"


@pytest.mark.asyncio
async def test_create_module(client: AsyncClient, db_session):
    await _create_user(
        db_session, "mentor_module@test.com", "mentor_module",
        role=UserRole.mentor, is_approved=True
    )
    token = await _get_token(client, "mentor_module@test.com")
    create_resp = await client.post("/api/v1/courses/", json=COURSE_PAYLOAD, headers=auth_headers(token))
    course_id = create_resp.json()["id"]
    mod_resp = await client.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "Module 1", "description": "First module", "order": 0},
        headers=auth_headers(token)
    )
    assert mod_resp.status_code == 201
    assert mod_resp.json()["title"] == "Module 1"
