"""
Notification schemas — responses for /notifications endpoints.
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.notification import NotificationType


# ── Notification Responses ───────────────────────────────────────────────────

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: NotificationType
    title: str
    message: str
    is_read: bool
    action_url: Optional[str] = None
    created_at: datetime
