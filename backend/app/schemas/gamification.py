from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date
from app.models.gamification import PointReason, LeaderboardScope, LeaderboardPeriod


class StreakOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date]
    streak_freezes_available: int
    streak_frozen_today: bool
    updated_at: datetime


class PointTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount: int
    reason: PointReason
    reference_id: Optional[str]
    description: Optional[str]
    created_at: datetime


class PointsBalanceOut(BaseModel):
    balance: int
    recent: list[PointTransactionOut]


class LeaderboardEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rank: int
    user_id: int
    username: str
    full_name: str
    avatar_url: Optional[str]
    total_points: int


class LeaderboardOut(BaseModel):
    scope: LeaderboardScope
    period: LeaderboardPeriod
    entries: list[LeaderboardEntryOut]
    my_rank: Optional[int]
    my_points: Optional[int]
