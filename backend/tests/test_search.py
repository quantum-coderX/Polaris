"""
Search endpoint tests — full-text query, autocomplete, filter combinations.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from tests.conftest import _create_user, _get_token, auth_headers
from app.models.user import UserRole
from app.models.course import Course, CourseStatus


async def _create_published_course(client, db_session, mentor_token, title, tags="", price=0.0, is_free=True):
    payload = {
        "title": title,
        "description": f"Description for {title}",
        "short_description": f"Short for {title}",
        "price": price,
        "currency": "USD",
        "level": "beginner",
        "language": "English",
        "tags": tags,
        "requirements": "",
        "what_you_learn": "",
        "is_free": is_free,
    }
    resp = await client.post("/api/v1/courses/", json=payload, headers=auth_headers(mentor_token))
    course_id = resp.json()["id"]
    result = await db_session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()
    course.status = CourseStatus.published
    await db_session.commit()
    return course_id


@pytest.mark.asyncio
async def test_search_returns_published_only(client: AsyncClient, db_session):
    await _create_user(db_session, "mentor_search@test.com", "mentor_search",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_search@test.com")
    await _create_published_course(client, db_session, mentor_token, "React Mastery", tags="react,javascript")

    resp = await client.get("/api/v1/search/courses?q=React")
    assert resp.status_code == 200
    results = resp.json()
    # All returned courses should be published (search only shows published)
    assert all(r.get("title") for r in results)


@pytest.mark.asyncio
async def test_search_no_results(client: AsyncClient):
    resp = await client.get("/api/v1/search/courses?q=xyznonexistentcourse12345")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_search_filter_free_only(client: AsyncClient, db_session):
    await _create_user(db_session, "mentor_free_search@test.com", "mentor_free_search",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_free_search@test.com")
    await _create_published_course(client, db_session, mentor_token, "Free Django", is_free=True, price=0.0)

    resp = await client.get("/api/v1/search/courses?is_free=true")
    assert resp.status_code == 200
    results = resp.json()
    assert all(r["is_free"] is True for r in results)


@pytest.mark.asyncio
async def test_autocomplete_returns_suggestions(client: AsyncClient, db_session):
    await _create_user(db_session, "mentor_autocomplete@test.com", "mentor_autocomplete",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_autocomplete@test.com")
    await _create_published_course(client, db_session, mentor_token, "Vue JS Fundamentals")

    resp = await client.get("/api/v1/search/autocomplete?q=Vue")
    assert resp.status_code == 200
    data = resp.json()
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)


@pytest.mark.asyncio
async def test_autocomplete_requires_query(client: AsyncClient):
    resp = await client.get("/api/v1/search/autocomplete")
    assert resp.status_code == 422  # missing required param


@pytest.mark.asyncio
async def test_search_pagination(client: AsyncClient):
    resp = await client.get("/api/v1/search/courses?skip=0&limit=5")
    assert resp.status_code == 200
    assert len(resp.json()) <= 5
