import enum
from datetime import datetime
from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    mentor = "mentor"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.student, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(String(1000))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)  # For mentors

    # ── 2FA / TOTP ──────────────────────────────────────────────────────────
    totp_secret: Mapped[str | None] = mapped_column(String(64))       # base32 TOTP secret
    is_2fa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    courses_created = relationship("Course", back_populates="mentor", foreign_keys="Course.mentor_id")
    enrollments = relationship("Enrollment", back_populates="student")
    reviews = relationship("Review", back_populates="student")
    notifications = relationship("Notification", back_populates="user")
    qa_messages = relationship("QAMessage", back_populates="author")

    # Gamification
    streak = relationship("Streak", uselist=False, back_populates="user")
    points_entries = relationship("PointsLedger", back_populates="user")
    leaderboard_entries = relationship("LeaderboardEntry", back_populates="user")
