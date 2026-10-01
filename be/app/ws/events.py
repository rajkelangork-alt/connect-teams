from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class WSEventType(str, Enum):
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    MESSAGE_NEW = "message:new"
    MESSAGE_UPDATE = "message:update"
    MESSAGE_DELETE = "message:delete"
    TYPING_START = "typing:start"
    TYPING_STOP = "typing:stop"
    PRESENCE_CHANGE = "presence:change"
    ERROR = "error"


class WSMessagePayload(BaseModel):
    event: WSEventType
    data: dict[str, Any] = Field(default_factory=dict)