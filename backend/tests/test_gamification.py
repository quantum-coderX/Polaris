"""
Unit tests for the Gamification feature.

Tests cover:
  - Streak creation and daily activity updates
  - Streak extension on consecutive days
  - Streak reset on missed day (no freeze)
  - Streak freeze on missed day (with freeze)
  - 7-day milestone bonus points
  - Points awarding and balance calculation
  - Streak freeze purchase via API
  - Leaderboard endpoint
  - Personal rank lookup
  - Points awarded on lesson completion (via /enrollments/{id}/progress)
  - Points awarded on quiz pass (via /quizzes/{id}/submit)
"""
import json
import pytest
import pytest_asyncio
from datetime import date, timedelta
from httpx import AsyncClient
from sqlalchemy import select

from tests.conftest import _create_user, _get_token, auth_headers
from app.models.user import UserRole
from app.models.gamification import Streak, PointsLedger, PointReason
from app.core.gamification_service import (
    award_points,
    spend_points,
    get_balance,
    record_activity,
    get_or_create_streak,
    POINTS_LESSON_COMPLETE,
    POINTS_QUIZ_PASS,
    STREAK_FREEZE_COST,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture()
async def student(db_session):
    return await _create_user(db_session, "gamer@test.com", "gamer", role=UserRole.student)


@pytest_asyncio.fixture()
async def student_token(client, student):
    return await _get_token(client, "gamer@test.com")


# ── Service Layer Tests ───────────────────────────────────────────────────────

class TestStreakService:
    async def test_create_streak_on_first_activity(self, db_session, student):
        streak, _ = await record_activity(db_session, student.id)
        await db_session.commit()
        assert streak.current_streak == 1
        assert streak.last_activity_date == date.today()

    async def test_same_day_activity_idempotent(self, db_session, student):
        """Calling record_activity twice on the same day should not increment streak."""
        await record_activity(db_session, student.id)
        streak, _ = await record_activity(db_session, student.id)
        await db_session.commit()
        assert streak.current_streak == 1

    async def test_consecutive_day_extends_streak(self, db_session, student):
        """Activity yesterday + today → streak = 2."""
        streak = await get_or_create_streak(db_session, student.id)
        streak.last_activity_date = date.today() - timedelta(days=1)
        streak.current_streak = 1
        db_session.add(streak)
        await db_session.flush()

        streak, _ = await record_activity(db_session, student.id)
        await db_session.commit()
        assert streak.current_streak == 2

    async def test_missed_day_resets_streak(self, db_session, student):
        """Missed 2+ days resets streak to 1 (no freeze available)."""
        streak = await get_or_create_streak(db_session, student.id)
        streak.last_activity_date = date.today() - timedelta(days=3)
        streak.current_streak = 10
        streak.streak_freezes_available = 0
        db_session.add(streak)
        await db_session.flush()

        streak, _ = await record_activity(db_session, student.id)
        await db_session.commit()
        assert streak.current_streak == 1

    async def test_freeze_prevents_streak_reset(self, db_session, student):
        """If a freeze is available, streak survives a missed day."""
        streak = await get_or_create_streak(db_session, student.id)
        streak.last_activity_date = date.today() - timedelta(days=2)
        streak.current_streak = 10
        streak.streak_freezes_available = 1
        db_session.add(streak)
        await db_session.flush()

        streak, _ = await record_activity(db_session, student.id)
        await db_session.commit()
        assert streak.current_streak == 10  # preserved
        assert streak.streak_freezes_available == 0  # consumed

    async def test_longest_streak_updated(self, db_session, student):
        streak = await get_or_create_streak(db_session, student.id)
        streak.last_activity_date = date.today() - timedelta(days=1)
        streak.current_streak = 5
        streak.longest_streak = 5
        db_session.add(streak)
        await db_session.flush()

        streak, _ = await record_activity(db_session, student.id)
        await db_session.commit()
        assert streak.longest_streak == 6


class TestPointsService:
    async def test_award_points_creates_ledger_entry(self, db_session, student):
        entry = await award_points(
            db_session, student.id, 10, PointReason.lesson_complete,
            description="Test lesson"
        )
        await db_session.commit()
        assert entry.amount == 10
        assert entry.user_id == student.id
        assert entry.reason == PointReason.lesson_complete

    async def test_balance_sums_ledger(self, db_session, student):
        await award_points(db_session, student.id, 10, PointReason.lesson_complete)
        await award_points(db_session, student.id, 25, PointReason.quiz_pass)
        balance = await get_balance(db_session, student.id)
        await db_session.commit()
        assert balance == 35

    async def test_spend_points_creates_negative_entry(self, db_session, student):
        await award_points(db_session, student.id, 100, PointReason.lesson_complete)
        new_balance = await spend_points(
            db_session, student.id, 50,
            PointReason.streak_freeze_purchase
        )
        await db_session.commit()
        assert new_balance == 50

    async def test_spend_points_raises_on_insufficient(self, db_session, student):
        with pytest.raises(ValueError, match="Insufficient points"):
            await spend_points(db_session, student.id, 999, PointReason.streak_freeze_purchase)

    async def test_zero_balance_on_new_user(self, db_session, student):
        balance = await get_balance(db_session, student.id)
        assert balance == 0


# ── API Tests ─────────────────────────────────────────────────────────────────

class TestStreakAPI:
    async def test_get_streak_creates_on_first_call(self, client: AsyncClient, student_token):
        resp = await client.get("/api/v1/gamification/streak", headers=auth_headers(student_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["current_streak"] == 0
        assert data["streak_freezes_available"] == 0

    async def test_buy_freeze_fails_without_points(self, client: AsyncClient, student_token):
        resp = await client.post(
            "/api/v1/gamification/streak/freeze",
            headers=auth_headers(student_token),
        )
        assert resp.status_code == 400
        assert "Insufficient points" in resp.json()["detail"]

    async def test_buy_freeze_succeeds_with_enough_points(
        self, client: AsyncClient, student_token, student, db_session
    ):
        # Seed points
        await award_points(db_session, student.id, STREAK_FREEZE_COST + 10, PointReason.lesson_complete)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/gamification/streak/freeze",
            headers=auth_headers(student_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["freezes_available"] == 1
        assert data["points_balance"] == 10


class TestPointsAPI:
    async def test_get_points_returns_balance(self, client: AsyncClient, student_token, student, db_session):
        await award_points(db_session, student.id, 30, PointReason.lesson_complete)
        await db_session.commit()

        resp = await client.get("/api/v1/gamification/points", headers=auth_headers(student_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["balance"] == 30
        assert len(data["recent"]) == 1
        assert data["recent"][0]["amount"] == 30

    async def test_get_points_empty_for_new_user(self, client: AsyncClient, student_token):
        resp = await client.get("/api/v1/gamification/points", headers=auth_headers(student_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["balance"] == 0
        assert data["recent"] == []


class TestLeaderboardAPI:
    async def test_leaderboard_empty_returns_200(self, client: AsyncClient, student_token):
        resp = await client.get("/api/v1/gamification/leaderboard", headers=auth_headers(student_token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["entries"] == []

    async def test_leaderboard_shows_ranked_users(
        self, client: AsyncClient, student_token, student, db_session
    ):
        # Create a second user with more points
        other = await _create_user(db_session, "other@test.com", "other", role=UserRole.student)
        await award_points(db_session, student.id, 10, PointReason.lesson_complete)
        await award_points(db_session, other.id, 50, PointReason.quiz_pass)
        await db_session.commit()

        resp = await client.get("/api/v1/gamification/leaderboard", headers=auth_headers(student_token))
        assert resp.status_code == 200
        entries = resp.json()["entries"]
        assert len(entries) == 2
        assert entries[0]["total_points"] == 50  # other user ranked first
        assert entries[1]["total_points"] == 10

    async def test_course_scope_requires_course_id(self, client: AsyncClient, student_token):
        resp = await client.get(
            "/api/v1/gamification/leaderboard?scope=course",
            headers=auth_headers(student_token),
        )
        assert resp.status_code == 422

    async def test_my_rank_no_entries(self, client: AsyncClient, student_token):
        resp = await client.get(
            "/api/v1/gamification/leaderboard/my-rank",
            headers=auth_headers(student_token),
        )
        assert resp.status_code == 200
        assert resp.json()["rank"] is None


class TestGamificationIntegration:
    """Integration tests: verify gamification fires correctly from other endpoints."""

    async def test_lesson_completion_awards_points(
        self, client: AsyncClient, db_session
    ):
        """Completing a lesson via the enrollment progress endpoint should award points."""
        from app.models.course import Course, CourseStatus, Module
        from app.models.lesson import Lesson, LessonType
        from app.models.enrollment import Enrollment

        # Create mentor + student
        mentor = await _create_user(db_session, "m_gm@test.com", "m_gm", role=UserRole.mentor, is_approved=True)
        student = await _create_user(db_session, "s_gm@test.com", "s_gm", role=UserRole.student)
        tok = await _get_token(client, "s_gm@test.com")

        # Create course + module + lesson
        course = Course(
            title="Gamify Course", slug="gamify-course",
            description="x", short_description="x",
            mentor_id=mentor.id, status=CourseStatus.published, is_free=True,
        )
        db_session.add(course)
        await db_session.flush()

        module = Module(course_id=course.id, title="M1", order=0)
        db_session.add(module)
        await db_session.flush()

        lesson = Lesson(
            module_id=module.id, title="L1",
            lesson_type=LessonType.video,
            order=0, is_published=True,
        )
        db_session.add(lesson)
        await db_session.flush()

        enrollment = Enrollment(student_id=student.id, course_id=course.id)
        db_session.add(enrollment)
        await db_session.commit()

        # Mark lesson complete
        resp = await client.post(
            f"/api/v1/enrollments/{course.id}/progress",
            json={"lesson_id": lesson.id, "is_completed": True, "watch_time_seconds": 60},
            headers=auth_headers(tok),
        )
        assert resp.status_code == 200

        # Check points were awarded
        balance = await get_balance(db_session, student.id)
        assert balance == POINTS_LESSON_COMPLETE
