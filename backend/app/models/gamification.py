"""
Gamification models — Streaks, Points Ledger, and Leaderboard.

Streak: Tracks daily activity streaks per user with freeze capability.
PointsLedger: Immutable append-only log of all point transactions.
LeaderboardEntry: Denormalized ranking table for fast leaderboard reads.
"""
import enum
from datetime import datetime, date
from sqlalchemy import (
    String, Text, Boolean, Enum as SAEnum, DateTime, Date,
    ForeignKey, Numeric, Integer, func, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class PointReason(str, enum.Enum):
    lesson_complete = "lesson_complete"
    quiz_pass = "quiz_pass"
    qa_contribution = "qa_contribution"
    streak_bonus = "streak_bonus"
    streak_freeze_purchase = "streak_freeze_purchase"
    daily_login = "daily_login"


class LeaderboardScope(str, enum.Enum):
    global_scope = "global"
    course = "course"


class LeaderboardPeriod(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"
    all_time = "all_time"


class Streak(Base):
    __tablename__ = "streaks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_date: Mapped[date | None] = mapped_column(Date)
    streak_freezes_available: Mapped[int] = mapped_column(Integer, default=0)
    streak_frozen_today: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="streak")


class PointsLedger(Base):
    """Immutable append-only ledger of point transactions."""
    __tablename__ = "points_ledger"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # positive = earn, negative = spend
    reason: Mapped[PointReason] = mapped_column(SAEnum(PointReason), nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(255))  # e.g. "lesson:42", "quiz:7"
    description: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="points_entries")


class LeaderboardEntry(Base):
    """Denormalized leaderboard for fast reads. Rebuilt/updated on point changes."""
    __tablename__ = "leaderboard_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "scope", "scope_id", "period", name="uq_leaderboard_entry"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    scope: Mapped[LeaderboardScope] = mapped_column(SAEnum(LeaderboardScope), default=LeaderboardScope.global_scope)
    scope_id: Mapped[int | None] = mapped_column(Integer)  # course_id when scope=course
    period: Mapped[LeaderboardPeriod] = mapped_column(SAEnum(LeaderboardPeriod), default=LeaderboardPeriod.all_time)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    rank: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="leaderboard_entries")
