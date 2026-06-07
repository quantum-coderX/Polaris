"""
Payment schemas — requests and responses for /payments endpoints.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.payment import PaymentProvider, PaymentStatus


# ── Payment Requests ──────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    course_id: int
    success_url: str
    cancel_url: str


class RefundRequest(BaseModel):
    payment_id: int
    reason: str


# ── Payment Responses ─────────────────────────────────────────────────────────

class CheckoutResponse(BaseModel):
    checkout_url: str
    payment_id: int
    session_id: str


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    course_id: int
    enrollment_id: Optional[int]
    provider: PaymentProvider
    provider_payment_id: Optional[str]
    provider_session_id: Optional[str]
    amount: float
    currency: str
    status: PaymentStatus
    refund_reason: Optional[str]
    refunded_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
