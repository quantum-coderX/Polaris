from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import ValidationError

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import decode_token
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.qa import QAMessage
from app.models.course import Course
from app.websockets.qa_manager import manager

router = APIRouter(prefix="/qa", tags=["Q&A"])


from app.schemas.qa import QAMessageOut, QAMessageCreate, QAClientFrame, QAEventFrame


# ── HTTP endpoints ───────────────────────────────────────────────────────────

@router.get("/{course_id}/messages", response_model=list[QAMessageOut])
async def get_messages(
    course_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QAMessage).where(
            QAMessage.course_id == course_id,
            QAMessage.parent_id == None,
            QAMessage.is_deleted == False,
        ).order_by(QAMessage.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{course_id}/messages/{message_id}/replies", response_model=list[QAMessageOut])
async def get_replies(message_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QAMessage).where(
            QAMessage.parent_id == message_id,
            QAMessage.is_deleted == False,
        ).order_by(QAMessage.created_at)
    )
    return result.scalars().all()


@router.post("/{course_id}/messages", response_model=QAMessageOut, status_code=201)
async def post_message(
    course_id: int,
    body: QAMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msg = QAMessage(course_id=course_id, author_id=current_user.id, **body.model_dump())
    db.add(msg)
    await db.flush()
    await db.refresh(msg)

    # ── Email the parent question author on reply (non-blocking) ────────
    if body.parent_id:
        try:
            from app.core.email import send_email, qa_answer_email
            parent_result = await db.execute(
                select(QAMessage).where(QAMessage.id == body.parent_id)
            )
            parent_msg = parent_result.scalar_one_or_none()
            if parent_msg and parent_msg.author_id != current_user.id:
                author_result = await db.execute(
                    select(User).where(User.id == parent_msg.author_id)
                )
                author = author_result.scalar_one_or_none()
                course_result = await db.execute(
                    select(Course).where(Course.id == course_id)
                )
                _course = course_result.scalar_one_or_none()
                if author and _course:
                    qa_url = f"http://localhost:5173/learn/{course_id}"
                    await send_email(
                        to=author.email,
                        subject=f"Your question in {_course.title} was answered – Polaris",
                        html_body=qa_answer_email(
                            author.full_name, _course.title, body.body, qa_url
                        ),
                    )
        except Exception:
            pass

    return msg


@router.delete("/{course_id}/messages/{message_id}", status_code=204)
async def delete_message(
    course_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(QAMessage).where(QAMessage.id == message_id))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.author_id != current_user.id and current_user.role not in [UserRole.mentor, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Not allowed")
    msg.is_deleted = True
    db.add(msg)


@router.post("/{course_id}/messages/{message_id}/pin", status_code=200)
async def pin_message(
    course_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in [UserRole.mentor, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Only mentors/admins can pin")
    result = await db.execute(select(QAMessage).where(QAMessage.id == message_id))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Not found")
    msg.is_pinned = not msg.is_pinned
    db.add(msg)
    return {"is_pinned": msg.is_pinned}


# ── WebSocket endpoint ───────────────────────────────────────────────────────

@router.websocket("/ws/{course_id}")
async def qa_websocket(
    websocket: WebSocket,
    course_id: int,
    token: str = Query(...),
):
    """
    ws://host/api/v1/qa/ws/{course_id}?token=<access_token>

    Incoming JSON : {"body": "...", "parent_id": null}
    Outgoing JSON : {"event": "message", "data": {...QAMessageOut fields...}}
    """
    # ── Authenticate ────────────────────────────────────────────────────────
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4001)
            return
        user_id = int(payload["sub"])
    except Exception:
        await websocket.close(code=4001)
        return

    # ── Join room ────────────────────────────────────────────────────────────
    await manager.connect(websocket, course_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                client_frame = QAClientFrame.model_validate_json(raw)
            except ValidationError:
                continue

            # ── Persist to DB ────────────────────────────────────────────────
            async with AsyncSessionLocal() as db:
                msg = QAMessage(
                    course_id=course_id,
                    author_id=user_id,
                    body=client_frame.body,
                    parent_id=client_frame.parent_id,
                )
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

            frame = QAEventFrame(data=QAMessageOut.model_validate(msg))

            # ── Fan-out via Redis Pub/Sub (local-only fallback when unset) ───
            await manager.publish(course_id, frame)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, course_id)
    except Exception:
        await manager.disconnect(websocket, course_id)
