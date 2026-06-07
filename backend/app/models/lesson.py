import enum
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Enum as SAEnum, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class LessonType(str, enum.Enum):
    video = "video"
    pdf = "pdf"
    document = "document"
    quiz = "quiz"
    text = "text"


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    lesson_type: Mapped[LessonType] = mapped_column(SAEnum(LessonType), default=LessonType.video)
    content_url: Mapped[str | None] = mapped_column(String(500))   # S3 key
    content_text: Mapped[str | None] = mapped_column(Text)          # For text lessons
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_preview: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    module = relationship("Module", back_populates="lessons")
    progress_records = relationship("LessonProgress", back_populates="lesson")
    attachments = relationship("LessonAttachment", back_populates="lesson", cascade="all, delete-orphan")
    quiz = relationship("Quiz", back_populates="lesson", uselist=False, cascade="all, delete-orphan")


class LessonAttachment(Base):
    __tablename__ = "lesson_attachments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255))
    s3_key: Mapped[str] = mapped_column(String(500))
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    content_type: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("Lesson", back_populates="attachments")
