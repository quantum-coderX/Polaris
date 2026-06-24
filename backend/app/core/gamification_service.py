"""
Gamification service — pure business logic, no FastAPI dependency.

Isolating logic here makes it easy to unit-test without HTTP overhead,
and lets both the enrollment hook and the dedicated gamification router
call the same functions.
"""
from datetime import datetime, date, timezone
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import (
    Streak, PointsLedger, LeaderboardEntry,
    PointReason, LeaderboardScope, LeaderboardPeriod,
)
from app.core.config import get_settings

settings = get_settings()

# ── Point values ─────────────────────────────────────────────────────────────
POINTS_LESSON_COMPLETE = 10
POINTS_QUIZ_PASS = 25
POINTS_QA_CONTRIBUTION = 5
POINTS_STREAK_7_DAY = 50
POINTS_STREAK_30_DAY = 200
STREAK_FREEZE_COST = 50


# ── Streak helpers ────────────────────────────────────────────────────────────

async def get_or_create_streak(db: AsyncSession, user_id: int) -> Streak:
    result = await db.execute(select(Streak).where(Streak.user_id == user_id))
    streak = result.scalar_one_or_none()
    if not streak:
        streak = Streak(user_id=user_id)
        db.add(streak)
        await db.flush()
        await db.refresh(streak)
    return streak


async def record_activity(db: AsyncSession, user_id: int) -> tuple[Streak, list[PointReason]]:
    """
    Update the user's streak based on today's activity.
    Returns (streak, [bonus_reasons_awarded]).
    """
    streak = await get_or_create_streak(db, user_id)
    today = date.today()
    bonuses: list[PointReason] = []

    if streak.last_activity_date == today:
        return streak, bonuses  # Already logged today

    from datetime import timedelta
    yesterday = today - timedelta(days=1)

    if streak.last_activity_date == yesterday:
        # Consecutive day — extend streak
        streak.current_streak += 1
    elif streak.last_activity_date is not None and streak.last_activity_date < yesterday:
        # Missed a day — check for freeze
        if streak.streak_freezes_available > 0 and not streak.streak_frozen_today:
            streak.streak_freezes_available -= 1
            streak.streak_frozen_today = True
            # Streak is preserved, not incremented
        else:
            streak.current_streak = 1  # Reset
    else:
        streak.current_streak = 1  # First ever activity

    streak.last_activity_date = today
    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    # Reset freeze flag if new day
    if streak.streak_frozen_today and streak.last_activity_date != today:
        streak.streak_frozen_today = False

    # Award milestone bonuses
    if streak.current_streak == 7:
        bonuses.append(PointReason.streak_bonus)
        await award_points(db, user_id, POINTS_STREAK_7_DAY, PointReason.streak_bonus, "7-day streak!")
    elif streak.current_streak == 30:
        bonuses.append(PointReason.streak_bonus)
        await award_points(db, user_id, POINTS_STREAK_30_DAY, PointReason.streak_bonus, "30-day streak!")

    db.add(streak)
    await db.flush()
    return streak, bonuses


# ── Points helpers ────────────────────────────────────────────────────────────

async def award_points(
    db: AsyncSession,
    user_id: int,
    amount: int,
    reason: PointReason,
    description: str | None = None,
    reference_id: str | None = None,
) -> PointsLedger:
    entry = PointsLedger(
        user_id=user_id,
        amount=amount,
        reason=reason,
        description=description,
        reference_id=reference_id,
    )
    db.add(entry)
    await db.flush()

    # Update (or upsert) the global all_time leaderboard entry
    await _upsert_leaderboard(db, user_id, amount, LeaderboardScope.global_scope, None, LeaderboardPeriod.all_time)
    return entry


async def spend_points(
    db: AsyncSession,
    user_id: int,
    amount: int,
    reason: PointReason,
    description: str | None = None,
) -> int:
    """Spend points. Returns new balance. Raises ValueError if insufficient."""
    balance = await get_balance(db, user_id)
    if balance < amount:
        raise ValueError(f"Insufficient points: need {amount}, have {balance}")
    entry = PointsLedger(
        user_id=user_id,
        amount=-amount,
        reason=reason,
        description=description,
    )
    db.add(entry)
    await db.flush()
    return balance - amount


async def get_balance(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(PointsLedger.amount), 0))
        .where(PointsLedger.user_id == user_id)
    )
    return int(result.scalar())


# ── Leaderboard helpers ───────────────────────────────────────────────────────

async def _upsert_leaderboard(
    db: AsyncSession,
    user_id: int,
    delta: int,
    scope: LeaderboardScope,
    scope_id: int | None,
    period: LeaderboardPeriod,
):
    result = await db.execute(
        select(LeaderboardEntry).where(
            LeaderboardEntry.user_id == user_id,
            LeaderboardEntry.scope == scope,
            LeaderboardEntry.scope_id == scope_id,
            LeaderboardEntry.period == period,
        )
    )
    entry = result.scalar_one_or_none()
    if entry:
        entry.total_points += delta
    else:
        entry = LeaderboardEntry(
            user_id=user_id,
            scope=scope,
            scope_id=scope_id,
            period=period,
            total_points=max(0, delta),
        )
    db.add(entry)
    await db.flush()


async def get_leaderboard(
    db: AsyncSession,
    scope: LeaderboardScope,
    period: LeaderboardPeriod,
    scope_id: int | None,
    limit: int = 50,
) -> list[LeaderboardEntry]:
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(LeaderboardEntry)
        .where(
            LeaderboardEntry.scope == scope,
            LeaderboardEntry.scope_id == scope_id,
            LeaderboardEntry.period == period,
        )
        .options(joinedload(LeaderboardEntry.user))
        .order_by(LeaderboardEntry.total_points.desc())
        .limit(limit)
    )
    entries = result.scalars().all()
    # Assign ranks in-memory (avoids a separate UPDATE pass)
    for rank, entry in enumerate(entries, start=1):
        entry.rank = rank
    return entries
