"""
Redis-backed WebSocket ConnectionManager for real-time Q&A.

Local process keeps course_id → set[WebSocket] for connected clients.
Cross-server fan-out uses Redis Pub/Sub on channel ``course:qa:{course_id}``.

Flow:
  Client connects → WS /api/v1/qa/ws/{course_id}?token=<access_token>
  Server adds socket to local room dict
  Incoming message → persist to DB → publish QAEventFrame to Redis
  Each server's background listener receives the event → broadcast_local()
  Client disconnects → remove from local room dict (no leak)
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import DefaultDict, Set

import redis.asyncio as aioredis
from fastapi import WebSocket
from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

from app.core.config import get_settings
from app.schemas.qa import QAEventFrame

logger = logging.getLogger(__name__)
settings = get_settings()

QA_CHANNEL_PREFIX = "course:qa:"
QA_CHANNEL_PATTERN = f"{QA_CHANNEL_PREFIX}*"


def qa_channel(course_id: int) -> str:
    return f"{QA_CHANNEL_PREFIX}{course_id}"


def course_id_from_channel(channel: str) -> int:
    return int(channel.removeprefix(QA_CHANNEL_PREFIX))


class QAConnectionManager:
    def __init__(self) -> None:
        self._rooms: DefaultDict[int, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()
        self._redis: aioredis.Redis | None = None
        self._listener_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        if not settings.REDIS_URL:
            logger.info(
                "REDIS_URL not configured; Q&A WebSockets use in-process broadcast only"
            )
            return

        self._redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
        await self._redis.ping()
        self._listener_task = asyncio.create_task(
            self._redis_listener(),
            name="qa-redis-listener",
        )
        logger.info("Q&A Redis Pub/Sub listener started (pattern=%s)", QA_CHANNEL_PATTERN)

    async def shutdown(self) -> None:
        if self._listener_task is not None:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None

        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    async def connect(self, websocket: WebSocket, course_id: int) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms[course_id].add(websocket)

    async def disconnect(self, websocket: WebSocket, course_id: int) -> None:
        async with self._lock:
            room = self._rooms.get(course_id)
            if not room:
                return
            room.discard(websocket)
            if not room:
                del self._rooms[course_id]

    async def publish(self, course_id: int, frame: QAEventFrame) -> None:
        """Publish an event to all server instances (or broadcast locally if no Redis)."""
        if self._redis is None:
            await self.broadcast_local(course_id, frame)
            return

        await self._redis.publish(qa_channel(course_id), frame.model_dump_json())

    async def broadcast_local(self, course_id: int, frame: QAEventFrame) -> None:
        """Deliver a frame to every WebSocket connected on this process."""
        payload = frame.model_dump_json()

        async with self._lock:
            sockets = list(self._rooms.get(course_id, set()))

        if not sockets:
            return

        dead: Set[WebSocket] = set()
        for ws in sockets:
            try:
                await ws.send_text(payload)
            except WebSocketDisconnect:
                dead.add(ws)
            except RuntimeError:
                # Connection already closed (e.g. after abrupt client drop).
                dead.add(ws)
            except Exception:
                logger.warning(
                    "Failed to send Q&A frame to WebSocket in course %s",
                    course_id,
                    exc_info=True,
                )
                dead.add(ws)

        if dead:
            await self._prune_dead_sockets(course_id, dead)

    async def _prune_dead_sockets(self, course_id: int, dead: Set[WebSocket]) -> None:
        async with self._lock:
            room = self._rooms.get(course_id)
            if not room:
                return
            room -= dead
            if not room:
                del self._rooms[course_id]

    async def _redis_listener(self) -> None:
        assert self._redis is not None

        while True:
            pubsub = self._redis.pubsub()
            try:
                await pubsub.psubscribe(QA_CHANNEL_PATTERN)
                logger.debug("Subscribed to Redis pattern %s", QA_CHANNEL_PATTERN)

                async for message in pubsub.listen():
                    if message["type"] != "pmessage":
                        continue

                    channel = message["channel"]
                    raw_data = message["data"]
                    if not isinstance(channel, str) or not isinstance(raw_data, str):
                        continue

                    try:
                        course_id = course_id_from_channel(channel)
                        frame = QAEventFrame.model_validate_json(raw_data)
                    except (ValueError, ValidationError):
                        logger.warning(
                            "Ignoring invalid Q&A Pub/Sub payload on channel %s",
                            channel,
                        )
                        continue

                    await self.broadcast_local(course_id, frame)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception(
                    "Q&A Redis listener error; reconnecting in 1 second"
                )
                await asyncio.sleep(1)
            finally:
                try:
                    await pubsub.punsubscribe(QA_CHANNEL_PATTERN)
                    await pubsub.aclose()
                except Exception:
                    logger.debug("Error closing Q&A Redis pubsub", exc_info=True)

    def room_size(self, course_id: int) -> int:
        return len(self._rooms.get(course_id, set()))


# Singleton — imported by the Q&A router and application lifespan
manager = QAConnectionManager()
