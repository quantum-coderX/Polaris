# Pydantic schemas package
# Each module maps 1:1 to its domain (auth, course, lesson, etc.)

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TwoFAVerifyRequest,
    TwoFALoginRequest,
    TokenResponse,
    UserOut,
    TwoFASetupResponse,
)
from app.schemas.user import (
    UserPublicOut,
    UserPrivateOut,
    UserUpdateRequest,
)
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseOut,
    CourseListOut,
    ModuleCreate,
    ModuleUpdate,
    ModuleOut,
    CourseSearchResult,
    AutocompleteResult,
)
from app.schemas.lesson import (
    LessonCreate,
    LessonUpdate,
    LessonOut,
    LessonAttachmentCreate,
    LessonAttachmentOut,
    PresignedUrlResponse,
    StreamUrlResponse,
)
from app.schemas.enrollment import (
    ProgressUpdate,
    EnrollmentOut,
    LessonProgressOut,
)
from app.schemas.payment import (
    CheckoutRequest,
    RefundRequest,
    CheckoutResponse,
    PaymentOut,
)
from app.schemas.review import (
    ReviewCreate,
    ReviewReport,
    ReviewOut,
)
from app.schemas.notification import (
    NotificationOut,
)
from app.schemas.qa import (
    QAMessageCreate,
    QAMessageOut,
)
from app.schemas.certificate import (
    CertificateResponse,
    CertificateVerifyResponse,
)
from app.schemas.quiz import (
    QuizCreate,
    QuizQuestionCreate,
    SubmitAnswersRequest,
    QuizQuestionOut,
    QuizOut,
    QuizResult,
    AttemptOut,
)

__all__ = [
    # Auth
    "RegisterRequest",
    "LoginRequest",
    "TwoFAVerifyRequest",
    "TwoFALoginRequest",
    "TokenResponse",
    "UserOut",
    "TwoFASetupResponse",
    # User
    "UserPublicOut",
    "UserPrivateOut",
    "UserUpdateRequest",
    # Course
    "CourseCreate",
    "CourseUpdate",
    "CourseOut",
    "CourseListOut",
    "ModuleCreate",
    "ModuleUpdate",
    "ModuleOut",
    "CourseSearchResult",
    "AutocompleteResult",
    # Lesson
    "LessonCreate",
    "LessonUpdate",
    "LessonOut",
    "LessonAttachmentCreate",
    "LessonAttachmentOut",
    "PresignedUrlResponse",
    "StreamUrlResponse",
    # Enrollment
    "ProgressUpdate",
    "EnrollmentOut",
    "LessonProgressOut",
    # Payment
    "CheckoutRequest",
    "RefundRequest",
    "CheckoutResponse",
    "PaymentOut",
    # Review
    "ReviewCreate",
    "ReviewReport",
    "ReviewOut",
    # Notification
    "NotificationOut",
    # QA
    "QAMessageCreate",
    "QAMessageOut",
    # Certificate
    "CertificateResponse",
    "CertificateVerifyResponse",
    # Quiz
    "QuizCreate",
    "QuizQuestionCreate",
    "SubmitAnswersRequest",
    "QuizQuestionOut",
    "QuizOut",
    "QuizResult",
    "AttemptOut",
]
