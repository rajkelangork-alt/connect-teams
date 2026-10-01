from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class UserStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"
    BUSY = "busy"


class PresenceUpdate(BaseModel):
    status: UserStatus
    custom_status: str | None = None


class PresenceResponse(BaseModel):
    user_id: int
    status: UserStatus
    custom_status: str | None = None
    last_active_at: datetime

    model_config = ConfigDict(from_attributes=True)