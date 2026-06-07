"""
Quiz schemas — requests and responses for /quizzes endpoints.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
from app.models.quiz import QuizQuestionType


# ── Quiz Requests ─────────────────────────────────────────────────────────────

class QuizCreate(BaseModel):
    lesson_id: int
    title: str
    pass_score: float = 70.0


class QuizQuestionCreate(BaseModel):
    question_text: str
    question_type: QuizQuestionType = QuizQuestionType.multiple_choice
    options: Optional[List[str]] = None   # For MCQ: list of answer choices
    correct_answer: str                    # Index as string for MCQ ("0","1"...), or "True"/"False"
    explanation: Optional[str] = None
    order: int = 0


class SubmitAnswersRequest(BaseModel):
    answers: Dict[int, str]   # {question_id: answer_value}


# ── Quiz Responses ────────────────────────────────────────────────────────────

class QuizQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quiz_id: int
    question_text: str
    question_type: QuizQuestionType
    options: Optional[str]   # JSON string — no correct_answer exposed here
    order: int


class QuizOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    title: str
    pass_score: float
    created_at: datetime


class QuizResult(BaseModel):
    quiz_id: int
    attempt_id: int
    score: float
    passed: bool
    pass_score: float
    total_questions: int
    correct_count: int
    feedback: List[dict]   # per-question: {question_id, correct, explanation}


class AttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quiz_id: int
    student_id: int
    score: float
    passed: bool
    submitted_at: datetime
