from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Numeric, Integer, func, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_review"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1–5
    title: Mapped[str | None] = mapped_column(String(255))
    body: Mapped[str | None] = mapped_column(Text)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True)
    is_reported: Mapped[bool] = mapped_column(Boolean, default=False)
    report_reason: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("User", back_populates="reviews")
    course = relationship("Course", back_populates="reviews")


def get_weighted_rating_expression(dialect_name: str):
    from app.models.enrollment import Enrollment
    from sqlalchemy import case, cast, Float

    completion_weight = case(
        (Enrollment.status == "refunded", 0.0),
        (Enrollment.progress_percent >= 100.0, 1.5),
        (Enrollment.progress_percent >= 50.0, 1.0),
        else_=0.5
    )

    if dialect_name == "postgresql":
        days_since = func.extract('epoch', func.now() - Review.created_at) / 86400.0
        recency_weight = func.power(0.5, days_since / 365.0)
    else:
        recency_weight = cast(1.0, Float)

    return completion_weight * recency_weight

