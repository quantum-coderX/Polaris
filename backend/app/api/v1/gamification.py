"""
Gamification API — Streaks, Points, Leaderboard.

All mutations go through gamification_service to keep business logic
centralized and testable.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_student
from app.core.gamification_service import (
    get_or_create_streak,
    get_balance,
    spend_points,
    get_leaderboard,
    STREAK_FREEZE_COST,
)
from app.models.user import User
from app.models.gamification import (
    Streak, PointsLedger, LeaderboardEntry,
    PointReason, LeaderboardScope, LeaderboardPeriod,
)
from app.schemas.gamification import (
    StreakOut, PointsBalanceOut, PointTransactionOut,
    LeaderboardOut, LeaderboardEntryOut,
)

router = APIRouter(prefix="/gamification", tags=["Gamification"])


# ── Streak ───────────────────────────────────────────────────────────────────

@router.get("/streak", response_model=StreakOut)
async def get_my_streak(
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's streak information."""
    streak = await get_or_create_streak(db, current_user.id)
    return streak


@router.post("/streak/freeze", status_code=200)
async def buy_streak_freeze(
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Spend STREAK_FREEZE_COST points to add one streak freeze.
    Freezes prevent losing a streak when a day is missed.
    """
    try:
        new_balance = await spend_points(
            db, current_user.id,
            amount=STREAK_FREEZE_COST,
            reason=PointReason.streak_freeze_purchase,
            description="Streak freeze purchase",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    streak = await get_or_create_streak(db, current_user.id)
    streak.streak_freezes_available += 1
    db.add(streak)

    return {
        "message": "Streak freeze purchased!",
        "freezes_available": streak.streak_freezes_available,
        "points_balance": new_balance,
    }


# ── Points ───────────────────────────────────────────────────────────────────

@router.get("/points", response_model=PointsBalanceOut)
async def get_my_points(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Return points balance and recent transactions."""
    balance = await get_balance(db, current_user.id)
    result = await db.execute(
        select(PointsLedger)
        .where(PointsLedger.user_id == current_user.id)
        .order_by(PointsLedger.created_at.desc())
        .limit(limit)
    )
    recent = result.scalars().all()
    return PointsBalanceOut(
        balance=balance,
        recent=[PointTransactionOut.model_validate(t) for t in recent],
    )


# ── Leaderboard ───────────────────────────────────────────────────────────────

@router.get("/leaderboard", response_model=LeaderboardOut)
async def get_leaderboard_endpoint(
    scope: LeaderboardScope = LeaderboardScope.global_scope,
    period: LeaderboardPeriod = LeaderboardPeriod.all_time,
    course_id: Optional[int] = Query(None, description="Required when scope=course"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch ranked leaderboard.
    - scope=global returns all users sorted by all-time points.
    - scope=course requires course_id and ranks enrolled students.
    """
    if scope == LeaderboardScope.course and course_id is None:
        raise HTTPException(status_code=422, detail="course_id is required for course-scoped leaderboard")

    scope_id = course_id if scope == LeaderboardScope.course else None
    entries = await get_leaderboard(db, scope, period, scope_id, limit)

    my_rank = None
    my_points = None
    for e in entries:
        if e.user_id == current_user.id:
            my_rank = e.rank
            my_points = e.total_points
            break

    out_entries = [
        LeaderboardEntryOut(
            rank=e.rank,
            user_id=e.user_id,
            username=e.user.username,
            full_name=e.user.full_name,
            avatar_url=e.user.avatar_url,
            total_points=e.total_points,
        )
        for e in entries
    ]
    return LeaderboardOut(
        scope=scope,
        period=period,
        entries=out_entries,
        my_rank=my_rank,
        my_points=my_points,
    )


@router.get("/leaderboard/my-rank")
async def get_my_rank(
    scope: LeaderboardScope = LeaderboardScope.global_scope,
    period: LeaderboardPeriod = LeaderboardPeriod.all_time,
    course_id: Optional[int] = None,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's rank and points without fetching the full board."""
    scope_id = course_id if scope == LeaderboardScope.course else None
    result = await db.execute(
        select(LeaderboardEntry).where(
            LeaderboardEntry.user_id == current_user.id,
            LeaderboardEntry.scope == scope,
            LeaderboardEntry.scope_id == scope_id,
            LeaderboardEntry.period == period,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        balance = await get_balance(db, current_user.id)
        return {"rank": None, "total_points": balance, "message": "Not yet ranked — complete lessons to earn points!"}

    # Calculate rank by counting entries with more points
    result_rank = await db.execute(
        select(func.count(LeaderboardEntry.id)).where(
            LeaderboardEntry.scope == scope,
            LeaderboardEntry.scope_id == scope_id,
            LeaderboardEntry.period == period,
            LeaderboardEntry.total_points > entry.total_points,
        )
    )
    rank = int(result_rank.scalar()) + 1
    return {"rank": rank, "total_points": entry.total_points}
