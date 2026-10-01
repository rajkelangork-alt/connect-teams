from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import WorkspaceRole
from app.models.user import UserResponse


class WorkspaceBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)


class WorkspaceCreate(WorkspaceBase):
    slug: str | None = Field(default=None, min_length=2, max_length=100)


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)


class WorkspaceMemberAdd(BaseModel):
    email: str
    role: WorkspaceRole = WorkspaceRole.MEMBER


class WorkspaceMemberResponse(BaseModel):
    id: int
    user_id: int
    workspace_id: int
    role: WorkspaceRole
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


class WorkspaceResponse(WorkspaceBase):
    id: int
    slug: str
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)