from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import ChannelType


class ChannelBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    topic: str | None = Field(default=None, max_length=255)
    channel_type: ChannelType = ChannelType.PUBLIC


class ChannelCreate(ChannelBase):
    pass


class ChannelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    topic: str | None = Field(default=None, max_length=255)


class ChannelResponse(ChannelBase):
    id: int
    workspace_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)