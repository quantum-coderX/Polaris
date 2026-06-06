import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict
from typing import Optional

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import decode_token
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.qa import QAMessage
from app.websockets.qa_manager import manager

router = APIRouter(prefix="/qa", tags=["Q&A"])


from app.schemas.qa import QAMessageOut, QAMessageCreate


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
            data = json.loads(raw)
            body_text = data.get("body", "").strip()
            parent_id = data.get("parent_id")

            if not body_text:
                continue

            # ── Persist to DB ────────────────────────────────────────────────
            async with AsyncSessionLocal() as db:
                msg = QAMessage(
                    course_id=course_id,
                    author_id=user_id,
                    body=body_text,
                    parent_id=parent_id,
                )
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

                outbound = {
                    "event": "message",
                    "data": {
                        "id": msg.id,
                        "course_id": msg.course_id,
                        "author_id": msg.author_id,
                        "parent_id": msg.parent_id,
                        "body": msg.body,
                        "is_pinned": msg.is_pinned,
                        "upvotes": msg.upvotes,
                        "created_at": msg.created_at.isoformat(),
                    },
                }

            # ── Broadcast to entire room ─────────────────────────────────────
            await manager.broadcast(course_id, outbound)

    except WebSocketDisconnect:
        manager.disconnect(websocket, course_id)
    except Exception:
        manager.disconnect(websocket, course_id)
