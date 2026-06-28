"""
Stripe-only payment integration (sandbox).
PayPal removed — cleaner implementation, focused on production patterns.
"""
import logging

import stripe
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Header
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.config import get_settings
from app.models.user import User
from app.models.course import Course, CourseStatus
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.payment import Payment, PaymentProvider, PaymentStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])
settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY


from app.schemas.payment import CheckoutRequest, CheckoutResponse, RefundRequest


# ── Webhook helpers ───────────────────────────────────────────────────────────

async def _dispatch_enrollment_email(
    to: str,
    student_name: str,
    course_title: str,
    course_id: int,
) -> None:
    from app.core.email import enrollment_email, send_email

    learn_url = f"{settings.FRONTEND_URL}/learn/{course_id}"
    await send_email(
        to=to,
        subject=f"Enrolled in {course_title} – Polaris",
        html_body=enrollment_email(student_name, course_title, learn_url),
    )


async def _dispatch_refund_email(
    to: str,
    student_name: str,
    course_title: str,
    amount: float,
    currency: str,
) -> None:
    from app.core.email import refund_email, send_email

    await send_email(
        to=to,
        subject=f"Refund Processed for {course_title} – Polaris",
        html_body=refund_email(student_name, course_title, amount, currency),
    )


async def _find_payment_by_intent(db: AsyncSession, payment_intent_id: str) -> Payment | None:
    result = await db.execute(
        select(Payment).where(Payment.provider_payment_id == payment_intent_id)
    )
    return result.scalar_one_or_none()


async def _handle_checkout_completed(
    session_obj: dict,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
) -> None:
    session_id = session_obj["id"]
    payment_intent_id = session_obj.get("payment_intent")
    metadata = session_obj.get("metadata") or {}

    try:
        user_id = int(metadata["user_id"])
        course_id = int(metadata["course_id"])
    except (KeyError, TypeError, ValueError):
        logger.warning(
            "checkout.session.completed missing metadata (session=%s): %s",
            session_id,
            metadata,
        )
        return

    lookup = [Payment.provider_session_id == session_id]
    if payment_intent_id:
        lookup.append(Payment.provider_payment_id == payment_intent_id)

    result = await db.execute(select(Payment).where(or_(*lookup)))
    payment = result.scalar_one_or_none()
    if not payment:
        logger.error(
            "No pending payment for checkout session %s (intent=%s)",
            session_id,
            payment_intent_id,
        )
        return

    if payment.status == PaymentStatus.completed and payment.enrollment_id is not None:
        logger.info(
            "Idempotent skip: checkout.session.completed already processed (session=%s, intent=%s)",
            session_id,
            payment_intent_id,
        )
        return

    email_payload: dict | None = None

    async with db.begin():
        result = await db.execute(
            select(Payment).where(Payment.id == payment.id).with_for_update()
        )
        payment = result.scalar_one()
        if payment.status == PaymentStatus.completed and payment.enrollment_id is not None:
            logger.info(
                "Idempotent skip (locked): checkout.session.completed session=%s",
                session_id,
            )
            return

        payment.status = PaymentStatus.completed
        payment.provider_session_id = session_id
        if payment_intent_id:
            payment.provider_payment_id = payment_intent_id

        enrollment = Enrollment(
            student_id=user_id,
            course_id=course_id,
            status=EnrollmentStatus.active,
        )
        db.add(enrollment)
        await db.flush()
        payment.enrollment_id = enrollment.id

    student_result = await db.execute(select(User).where(User.id == user_id))
    student = student_result.scalar_one_or_none()
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if student and course:
        email_payload = {
            "to": student.email,
            "student_name": student.full_name,
            "course_title": course.title,
            "course_id": course_id,
        }

    if email_payload:
        background_tasks.add_task(_dispatch_enrollment_email, **email_payload)

    logger.info(
        "Enrolled student %s in course %s via checkout session %s",
        user_id,
        course_id,
        session_id,
    )


async def _handle_dispute_created(dispute_obj: dict, db: AsyncSession) -> None:
    payment_intent_id = dispute_obj.get("payment_intent")
    if not payment_intent_id:
        logger.warning(
            "charge.dispute.created without payment_intent (dispute=%s)",
            dispute_obj.get("id"),
        )
        return

    payment = await _find_payment_by_intent(db, payment_intent_id)
    if not payment:
        logger.error(
            "No payment record for disputed intent %s",
            payment_intent_id,
        )
        return

    if payment.status == PaymentStatus.disputed:
        logger.info(
            "Idempotent skip: charge.dispute.created intent=%s",
            payment_intent_id,
        )
        return

    async with db.begin():
        result = await db.execute(
            select(Payment).where(Payment.id == payment.id).with_for_update()
        )
        payment = result.scalar_one()
        if payment.status == PaymentStatus.disputed:
            return

        payment.status = PaymentStatus.disputed
        if payment.enrollment_id:
            enroll_result = await db.execute(
                select(Enrollment)
                .where(Enrollment.id == payment.enrollment_id)
                .with_for_update()
            )
            enrollment = enroll_result.scalar_one_or_none()
            if enrollment:
                enrollment.status = EnrollmentStatus.suspended

    logger.info(
        "Payment %s marked disputed; enrollment %s suspended",
        payment.id,
        payment.enrollment_id,
    )


async def _handle_charge_refunded(
    charge_obj: dict,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
) -> None:
    payment_intent_id = charge_obj.get("payment_intent")
    if not payment_intent_id:
        logger.warning(
            "charge.refunded without payment_intent (charge=%s)",
            charge_obj.get("id"),
        )
        return

    payment = await _find_payment_by_intent(db, payment_intent_id)
    if not payment:
        logger.error(
            "No payment record for refunded intent %s",
            payment_intent_id,
        )
        return

    if payment.status == PaymentStatus.refunded:
        logger.info(
            "Idempotent skip: charge.refunded intent=%s",
            payment_intent_id,
        )
        return

    email_payload: dict | None = None

    async with db.begin():
        result = await db.execute(
            select(Payment).where(Payment.id == payment.id).with_for_update()
        )
        payment = result.scalar_one()
        if payment.status == PaymentStatus.refunded:
            return

        payment.status = PaymentStatus.refunded
        payment.refunded_at = datetime.now(timezone.utc)
        if not payment.refund_reason:
            payment.refund_reason = "Stripe charge.refunded webhook"

        if payment.enrollment_id:
            enroll_result = await db.execute(
                select(Enrollment)
                .where(Enrollment.id == payment.enrollment_id)
                .with_for_update()
            )
            enrollment = enroll_result.scalar_one_or_none()
            if enrollment:
                enrollment.status = EnrollmentStatus.refunded

    student_result = await db.execute(select(User).where(User.id == payment.student_id))
    student = student_result.scalar_one_or_none()
    course_result = await db.execute(select(Course).where(Course.id == payment.course_id))
    course = course_result.scalar_one_or_none()
    if student and course:
        email_payload = {
            "to": student.email,
            "student_name": student.full_name,
            "course_title": course.title,
            "amount": float(payment.amount),
            "currency": payment.currency,
        }

    if email_payload:
        background_tasks.add_task(_dispatch_refund_email, **email_payload)

    logger.info(
        "Payment %s refunded via charge.refunded webhook",
        payment.id,
    )


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
    background_tasks: BackgroundTasks,
    stripe_signature: str | None = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Cryptographically verified Stripe webhook receiver.

    Handles:
      - checkout.session.completed  → atomic enrollment + payment completion
      - charge.dispute.created      → suspend enrollment, mark payment disputed
      - charge.refunded             → revoke enrollment, mark payment refunded
    """
    if not stripe_signature:
        logger.warning("Stripe webhook rejected: missing Stripe-Signature header")
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload,
            stripe_signature,
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook rejected: invalid signature")
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except ValueError as exc:
        logger.warning("Stripe webhook rejected: malformed payload (%s)", exc)
        raise HTTPException(status_code=400, detail="Webhook parse error")

    event_type = event["type"]
    event_id = event.get("id", "unknown")
    logger.info("Stripe webhook received: %s (%s)", event_type, event_id)

    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(
                event["data"]["object"],
                db,
                background_tasks,
            )
        elif event_type == "charge.dispute.created":
            await _handle_dispute_created(event["data"]["object"], db)
        elif event_type == "charge.refunded":
            await _handle_charge_refunded(
                event["data"]["object"],
                db,
                background_tasks,
            )
        else:
            logger.debug("Unhandled Stripe event type: %s", event_type)
    except SQLAlchemyError:
        logger.exception(
            "Database error processing Stripe webhook %s (%s)",
            event_type,
            event_id,
        )
        raise HTTPException(status_code=500, detail="Database error")
    except Exception:
        logger.exception(
            "Unexpected error processing Stripe webhook %s (%s)",
            event_type,
            event_id,
        )
        # Acknowledge so Stripe does not retry unrecoverable handler failures.
        return {"status": "ok", "event_id": event_id, "note": "handler_error_logged"}

    return {"status": "ok", "event_id": event_id}


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

    # ── Email on refund (non-blocking) ────────────────────────────
    try:
        from app.core.email import send_email, refund_email
        student_result = await db.execute(select(User).where(User.id == payment.student_id))
        student = student_result.scalar_one_or_none()
        course_result = await db.execute(select(Course).where(Course.id == payment.course_id))
        ref_course = course_result.scalar_one_or_none()
        if student and ref_course:
            await send_email(
                to=student.email,
                subject=f"Refund Processed for {ref_course.title} – Polaris",
                html_body=refund_email(
                    student.full_name, ref_course.title,
                    float(payment.amount), payment.currency,
                ),
            )
    except Exception:
        pass

    return {"status": "refunded", "payment_id": body.payment_id}


@router.get("/my", status_code=200)
async def my_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Payment).where(Payment.student_id == current_user.id))
    return result.scalars().all()
