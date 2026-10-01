from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import UserResponse


class MessageBase(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class MessageCreate(MessageBase):
    channel_id: int
    parent_id: int | None = None


class MessageUpdate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: int
    channel_id: int
    sender_id: int
    parent_id: int | None = None
    created_at: datetime
    updated_at: datetime
    sender: UserResponse

    model_config = ConfigDict(from_attributes=True)