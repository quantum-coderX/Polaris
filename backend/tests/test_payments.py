"""
Payments tests — Stripe checkout session, webhook signature verification.
Stripe API calls are mocked to avoid network requests.
"""
import json
import hmac
import hashlib
import time
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient
from sqlalchemy import select
from tests.conftest import _create_user, _get_token, auth_headers
from app.models.user import UserRole
from app.models.course import Course, CourseStatus


PAID_COURSE = {
    "title": "Paid Stripe Course",
    "description": "Paid course for Stripe tests",
    "short_description": "Short desc",
    "price": 49.99,
    "currency": "usd",
    "level": "beginner",
    "language": "English",
    "tags": "",
    "requirements": "",
    "what_you_learn": "",
    "is_free": False,
}


async def _setup_paid_course(client, db_session) -> tuple[int, str]:
    """Create and publish a paid course. Returns (course_id, student_token)."""
    await _create_user(db_session, "mentor_stripe@test.com", "mentor_stripe",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_stripe@test.com")
    course_resp = await client.post("/api/v1/courses/", json=PAID_COURSE, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    result = await db_session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()
    course.status = CourseStatus.published
    await db_session.commit()

    await _create_user(db_session, "student_stripe@test.com", "student_stripe")
    student_token = await _get_token(client, "student_stripe@test.com")
    return course_id, student_token


@pytest.mark.asyncio
async def test_checkout_creates_session(client: AsyncClient, db_session):
    """POST /payments/checkout returns a Stripe checkout URL (mocked)."""
    course_id, student_token = await _setup_paid_course(client, db_session)

    mock_session = MagicMock()
    mock_session.id = "cs_test_mock_session_123"
    mock_session.url = "https://checkout.stripe.com/pay/cs_test_mock_session_123"

    with patch("stripe.checkout.Session.create", return_value=mock_session):
        resp = await client.post(
            "/api/v1/payments/checkout",
            json={
                "course_id": course_id,
                "success_url": "http://localhost:5173/success",
                "cancel_url": "http://localhost:5173/cancel",
            },
            headers=auth_headers(student_token),
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["checkout_url"] == "https://checkout.stripe.com/pay/cs_test_mock_session_123"
    assert data["session_id"] == "cs_test_mock_session_123"
    assert "payment_id" in data


@pytest.mark.asyncio
async def test_free_course_blocked_at_checkout(client: AsyncClient, db_session):
    """Cannot checkout a free course through /payments/checkout."""
    await _create_user(db_session, "mentor_free2@test.com", "mentor_free2",
                       role=UserRole.mentor, is_approved=True)
    mentor_token = await _get_token(client, "mentor_free2@test.com")
    free_course = {**PAID_COURSE, "title": "Free Course2", "price": 0.0, "is_free": True}
    course_resp = await client.post("/api/v1/courses/", json=free_course, headers=auth_headers(mentor_token))
    course_id = course_resp.json()["id"]
    result = await db_session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()
    course.status = CourseStatus.published
    await db_session.commit()

    await _create_user(db_session, "student_free2@test.com", "student_free2")
    student_token = await _get_token(client, "student_free2@test.com")
    resp = await client.post(
        "/api/v1/payments/checkout",
        json={
            "course_id": course_id,
            "success_url": "http://localhost:5173/success",
            "cancel_url": "http://localhost:5173/cancel",
        },
        headers=auth_headers(student_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_webhook_invalid_signature_rejected(client: AsyncClient):
    """Webhook with invalid Stripe signature must return 400."""
    resp = await client.post(
        "/api/v1/payments/webhook/stripe",
        content=b'{"type": "checkout.session.completed"}',
        headers={
            "stripe-signature": "t=invalid,v1=badsig",
            "Content-Type": "application/json",
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_my_payments_empty(client: AsyncClient, db_session):
    await _create_user(db_session, "student_nopay@test.com", "student_nopay")
    token = await _get_token(client, "student_nopay@test.com")
    resp = await client.get("/api/v1/payments/my", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json() == []
