import enum
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Enum as SAEnum, DateTime, ForeignKey, Numeric, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class CourseLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class CourseStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    published = "published"
    rejected = "rejected"
    archived = "archived"


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(300), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    short_description: Mapped[str] = mapped_column(String(500))
    thumbnail_url: Mapped[str | None] = mapped_column(String(500))
    promo_video_url: Mapped[str | None] = mapped_column(String(500))
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    level: Mapped[CourseLevel] = mapped_column(SAEnum(CourseLevel), default=CourseLevel.beginner)
    language: Mapped[str] = mapped_column(String(50), default="English")
    status: Mapped[CourseStatus] = mapped_column(SAEnum(CourseStatus), default=CourseStatus.draft)
    tags: Mapped[str | None] = mapped_column(String(500))  # comma-separated
    requirements: Mapped[str | None] = mapped_column(Text)
    what_you_learn: Mapped[str | None] = mapped_column(Text)
    total_duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    total_lessons: Mapped[int] = mapped_column(Integer, default=0)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False)
    mentor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    mentor = relationship("User", back_populates="courses_created", foreign_keys=[mentor_id])
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan", order_by="Module.order")
    enrollments = relationship("Enrollment", back_populates="course")
    reviews = relationship("Review", back_populates="course")
    qa_messages = relationship("QAMessage", back_populates="course")


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan", order_by="Lesson.order")
