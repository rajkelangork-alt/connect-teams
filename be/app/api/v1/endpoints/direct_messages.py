from typing import Annotated

from app.core.dependencies import get_current_user, get_db
from app.db.models import User
from app.models.message import MessageResponse
from app.services.dm_service import dm_service
from app.services.message_service import message_service
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class DMSendRequest(BaseModel):
    workspace_id: int
    recipient_id: int
    content: str = Field(min_length=1, max_length=5000)


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_direct_message(
    payload: DMSendRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        return await dm_service.send_dm(
            db,
            workspace_id=payload.workspace_id,
            sender_id=current_user.id,
            recipient_id=payload.recipient_id,
            content=payload.content,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get("/conversations/{workspace_id}/{other_user_id}", response_model=list[MessageResponse])
async def get_direct_conversation(
    workspace_id: int,
    other_user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    channel = await dm_service.get_or_create_dm_channel(
        db, workspace_id, current_user.id, other_user_id
    )
    return await message_service.list_for_channel(db, channel_id=channel.id, limit=limit)