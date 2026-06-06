import enum
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Enum as SAEnum, DateTime, ForeignKey, Numeric, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class QuizQuestionType(str, enum.Enum):
    multiple_choice = "multiple_choice"
    true_false = "true_false"
    short_answer = "short_answer"


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255))
    pass_score: Mapped[float] = mapped_column(Numeric(5, 2), default=70.0)  # percentage
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("Lesson", back_populates="quiz")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.order")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuizQuestionType] = mapped_column(SAEnum(QuizQuestionType), default=QuizQuestionType.multiple_choice)
    options: Mapped[str | None] = mapped_column(Text)  # JSON string for MCQ choices
    correct_answer: Mapped[str] = mapped_column(Text)  # index (MCQ) or "True"/"False" or text
    explanation: Mapped[str | None] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer, default=0)

    quiz = relationship("Quiz", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)   # percentage 0-100
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    answers: Mapped[str | None] = mapped_column(Text)  # JSON: {question_id: answer}
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    quiz = relationship("Quiz", back_populates="attempts")
