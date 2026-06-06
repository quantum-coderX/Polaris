"""
In-memory WebSocket ConnectionManager for real-time Q&A.

Uses a simple dict: course_id → set[WebSocket]
No Redis, no external broker — works perfectly for single-server deployment.

Flow:
  Client connects → WS /api/v1/qa/ws/{course_id}?token=<access_token>
  Server adds socket to room dict
  Incoming message → persist to DB → broadcast to all sockets in room
  Client disconnects → remove from room dict
"""
import json
from collections import defaultdict
from typing import DefaultDict, Set

from fastapi import WebSocket


class QAConnectionManager:
    def __init__(self):
        # course_id → set of active WebSocket connections
        self._rooms: DefaultDict[int, Set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, course_id: int):
        await websocket.accept()
        self._rooms[course_id].add(websocket)

    def disconnect(self, websocket: WebSocket, course_id: int):
        self._rooms[course_id].discard(websocket)
        # Clean up empty rooms
        if not self._rooms[course_id]:
            del self._rooms[course_id]

    async def broadcast(self, course_id: int, message: dict):
        """Broadcast a message to every connected client in a course room."""
        payload = json.dumps(message)
        dead: Set[WebSocket] = set()
        for ws in list(self._rooms.get(course_id, [])):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        # Prune stale connections
        self._rooms[course_id] -= dead

    def room_size(self, course_id: int) -> int:
        return len(self._rooms.get(course_id, set()))


# Singleton — imported by the Q&A router
manager = QAConnectionManager()
