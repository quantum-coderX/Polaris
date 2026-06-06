"""
Notifications: in-memory WebSocket push + DB persistence.
No Redis pub/sub — direct broadcast to connected sockets.
"""
import json
from collections import defaultdict
from typing import DefaultDict, Set
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, ConfigDict

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import decode_token
from app.core.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification, NotificationType

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# In-memory registry: user_id → set of active WebSocket connections
_user_sockets: DefaultDict[int, Set[WebSocket]] = defaultdict(set)


# ── Helper ──────────────────────────────────────────────────────────────────

async def send_notification(
    user_id: int,
    type: NotificationType,
    title: str,
    message: str,
    action_url: str = "",
):
    """
    Persist a notification to DB and immediately push to any open WebSocket
    connections for this user. Call from anywhere in the app.
    """
    async with AsyncSessionLocal() as db:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            action_url=action_url,
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)

    payload = json.dumps({
        "id": notif.id,
        "type": type,
        "title": title,
        "message": message,
        "action_url": action_url,
        "created_at": notif.created_at.isoformat(),
    })

    # Push directly to all connected sockets for this user
    dead: Set[WebSocket] = set()
    for ws in list(_user_sockets.get(user_id, [])):
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    _user_sockets[user_id] -= dead


from app.schemas.notification import NotificationOut


# ── HTTP Endpoints ───────────────────────────────────────────────────────────

@router.get("/", response_model=list[NotificationOut])
async def get_notifications(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    stmt = stmt.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/read-all", status_code=200)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    return {"status": "ok"}


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.add(notif)
    return notif


# ── WebSocket Endpoint ───────────────────────────────────────────────────────

@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket, token: str = Query(...)):
    """
    ws://host/api/v1/notifications/ws?token=<access_token>
    Server pushes notification JSON whenever send_notification() is called for this user.
    """
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except Exception:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    _user_sockets[user_id].add(websocket)

    try:
        while True:
            # Keep-alive — client can send pings, we ignore them
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _user_sockets[user_id].discard(websocket)
        if not _user_sockets[user_id]:
            del _user_sockets[user_id]
