"""
Quiz API — Create quizzes, add MCQ questions, submit answers.
Scoring is done server-side; client never sees correct_answer until after submission.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_user, require_mentor, require_student
from app.models.user import User
from app.models.lesson import Lesson
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt, QuizQuestionType
from app.core.gamification_service import award_points, POINTS_QUIZ_PASS
from app.models.gamification import PointReason

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


from app.schemas.quiz import (
    QuizCreate,
    QuizQuestionCreate,
    QuizQuestionOut,
    QuizOut,
    SubmitAnswersRequest,
    QuizResult,
    AttemptOut,
)


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/", response_model=QuizOut, status_code=201)
async def create_quiz(
    body: QuizCreate,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    """Create a quiz for a lesson (mentor only). One quiz per lesson."""
    result = await db.execute(select(Lesson).where(Lesson.id == body.lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Prevent duplicate quizzes on the same lesson
    existing = await db.execute(select(Quiz).where(Quiz.lesson_id == body.lesson_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This lesson already has a quiz")

    quiz = Quiz(lesson_id=body.lesson_id, title=body.title, pass_score=body.pass_score)
    db.add(quiz)
    await db.flush()
    await db.refresh(quiz)
    return quiz


@router.get("/{quiz_id}", response_model=QuizOut)
async def get_quiz(quiz_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.get("/{quiz_id}/questions", response_model=list[QuizQuestionOut])
async def get_questions(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return questions WITHOUT correct_answer — safe for students."""
    result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.quiz_id == quiz_id)
        .order_by(QuizQuestion.order)
    )
    return result.scalars().all()


@router.post("/{quiz_id}/questions", response_model=QuizQuestionOut, status_code=201)
async def add_question(
    quiz_id: int,
    body: QuizQuestionCreate,
    current_user: User = Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Quiz not found")

    options_json = json.dumps(body.options) if body.options else None
    question = QuizQuestion(
        quiz_id=quiz_id,
        question_text=body.question_text,
        question_type=body.question_type,
        options=options_json,
        correct_answer=body.correct_answer,
        explanation=body.explanation,
        order=body.order,
    )
    db.add(question)
    await db.flush()
    await db.refresh(question)
    return question


@router.post("/{quiz_id}/submit", response_model=QuizResult)
async def submit_quiz(
    quiz_id: int,
    body: SubmitAnswersRequest,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Score a quiz submission server-side.
    Returns per-question feedback including explanations.
    """
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id).order_by(QuizQuestion.order)
    )
    questions = questions_result.scalars().all()
    if not questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions")

    # Score
    correct_count = 0
    feedback = []
    for q in questions:
        student_answer = str(body.answers.get(q.id, "")).strip().lower()
        correct = q.correct_answer.strip().lower()
        is_correct = student_answer == correct
        if is_correct:
            correct_count += 1
        feedback.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "your_answer": body.answers.get(q.id, ""),
            "correct_answer": q.correct_answer,
            "correct": is_correct,
            "explanation": q.explanation,
        })

    score = round((correct_count / len(questions)) * 100, 2)
    passed = score >= float(quiz.pass_score)

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=current_user.id,
        score=score,
        passed=passed,
        answers=json.dumps(body.answers),
    )
    db.add(attempt)
    await db.flush()
    await db.refresh(attempt)

    # ── Gamification hook (non-blocking) ───────────────────────────────
    if passed:
        try:
            await award_points(
                db, current_user.id,
                POINTS_QUIZ_PASS,
                PointReason.quiz_pass,
                description=f"Passed quiz {quiz_id}",
                reference_id=f"quiz:{quiz_id}",
            )
        except Exception:
            pass  # Never block quiz results for gamification errors

    return QuizResult(
        quiz_id=quiz_id,
        attempt_id=attempt.id,
        score=score,
        passed=passed,
        pass_score=float(quiz.pass_score),
        total_questions=len(questions),
        correct_count=correct_count,
        feedback=feedback,
    )


@router.get("/{quiz_id}/attempts", response_model=list[AttemptOut])
async def my_attempts(
    quiz_id: int,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Return this student's past attempts on a quiz."""
    result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.student_id == current_user.id,
        ).order_by(QuizAttempt.submitted_at.desc())
    )
    return result.scalars().all()
