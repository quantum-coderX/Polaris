"""
Stripe-only payment integration (sandbox).
PayPal removed — cleaner implementation, focused on production patterns.
"""
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.config import get_settings
from app.models.user import User
from app.models.course import Course, CourseStatus
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.payment import Payment, PaymentProvider, PaymentStatus

router = APIRouter(prefix="/payments", tags=["Payments"])
settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY


from app.schemas.payment import CheckoutRequest, CheckoutResponse, RefundRequest


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/checkout", response_model=CheckoutResponse, status_code=201)
async def create_checkout(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == body.course_id))
    course = result.scalar_one_or_none()
    if not course or course.status != CourseStatus.published:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.price <= 0:
        raise HTTPException(status_code=400, detail="Course is free — enroll via /enrollments/{course_id}")

    # Block double-enrollment
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == body.course_id,
            Enrollment.status == EnrollmentStatus.active,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already enrolled")

    # Create Stripe Checkout Session
    # Embed user_id + course_id in metadata for webhook resolution
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": course.currency.lower(),
                "product_data": {
                    "name": course.title,
                    "description": course.short_description,
                },
                "unit_amount": int(course.price * 100),  # Stripe uses cents
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=body.success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=body.cancel_url,
        metadata={
            "user_id": str(current_user.id),
            "course_id": str(course.id),
        },
    )

    # Record pending payment
    payment = Payment(
        student_id=current_user.id,
        course_id=course.id,
        provider=PaymentProvider.stripe,
        provider_session_id=session.id,
        amount=course.price,
        currency=course.currency,
        status=PaymentStatus.pending,
    )
    db.add(payment)
    await db.flush()
    await db.refresh(payment)

    return {
        "checkout_url": session.url,
        "payment_id": payment.id,
        "session_id": session.id,
    }


@router.post("/webhook/stripe", status_code=200)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Cryptographically verified Stripe webhook receiver.
    Handles: checkout.session.completed, charge.dispute.created
    """
    payload = await request.body()

    # Verify signature — reject anything that can't be verified
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook parse error")

    # ── checkout.session.completed → enroll student ──────────────────────────
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session["id"]
        user_id = int(session["metadata"]["user_id"])
        course_id = int(session["metadata"]["course_id"])

        result = await db.execute(
            select(Payment).where(Payment.provider_session_id == session_id)
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.completed
            payment.provider_payment_id = session.get("payment_intent")
            db.add(payment)

            # Atomic enrollment commit
            enrollment = Enrollment(student_id=user_id, course_id=course_id)
            db.add(enrollment)
            await db.flush()
            payment.enrollment_id = enrollment.id
            db.add(payment)

    # ── charge.dispute.created → suspend enrollment ──────────────────────────
    elif event["type"] == "charge.dispute.created":
        charge_id = event["data"]["object"].get("charge")
        result = await db.execute(
            select(Payment).where(Payment.provider_payment_id == charge_id)
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.disputed
            db.add(payment)
            if payment.enrollment_id:
                result = await db.execute(
                    select(Enrollment).where(Enrollment.id == payment.enrollment_id)
                )
                enrollment = result.scalar_one_or_none()
                if enrollment:
                    enrollment.status = EnrollmentStatus.suspended
                    db.add(enrollment)

    return {"status": "ok"}


@router.post("/refund", status_code=200)
async def refund_payment(
    body: RefundRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Payment).where(Payment.id == body.payment_id))
    payment = result.scalar_one_or_none()
    if not payment or payment.status != PaymentStatus.completed:
        raise HTTPException(status_code=404, detail="Completed payment not found")

    # Issue Stripe refund
    if payment.provider_payment_id:
        stripe.Refund.create(payment_intent=payment.provider_payment_id)

    payment.status = PaymentStatus.refunded
    payment.refund_reason = body.reason
    payment.refunded_at = datetime.now(timezone.utc)
    db.add(payment)

    # Revoke enrollment access
    if payment.enrollment_id:
        result = await db.execute(select(Enrollment).where(Enrollment.id == payment.enrollment_id))
        enrollment = result.scalar_one_or_none()
        if enrollment:
            enrollment.status = EnrollmentStatus.refunded
            db.add(enrollment)

    return {"status": "refunded", "payment_id": body.payment_id}


@router.get("/my", status_code=200)
async def my_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Payment).where(Payment.student_id == current_user.id))
    return result.scalars().all()
