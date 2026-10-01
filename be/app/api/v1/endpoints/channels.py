from typing import Annotated

from app.core.dependencies import get_current_user, get_db
from app.db.models import User
from app.models.channel import ChannelCreate, ChannelResponse, ChannelUpdate
from app.services.channel_service import channel_service
from app.services.workspace_service import workspace_service
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.post("/workspace/{workspace_id}", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_channel(
    workspace_id: int,
    channel_in: ChannelCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    membership = await workspace_service.get_member(
        db, workspace_id=workspace_id, user_id=current_user.id
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
        )
    return await channel_service.create(db, workspace_id=workspace_id, channel_in=channel_in)


@router.get("/workspace/{workspace_id}", response_model=list[ChannelResponse])
async def list_workspace_channels(
    workspace_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    membership = await workspace_service.get_member(
        db, workspace_id=workspace_id, user_id=current_user.id
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
        )
    return await channel_service.list_for_workspace(db, workspace_id=workspace_id)


@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    channel = await channel_service.get_by_id(db, channel_id=channel_id)
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    membership = await workspace_service.get_member(
        db, workspace_id=channel.workspace_id, user_id=current_user.id
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
        )
    return channel


@router.put("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: int,
    channel_in: ChannelUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    channel = await channel_service.get_by_id(db, channel_id=channel_id)
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    membership = await workspace_service.get_member(
        db, workspace_id=channel.workspace_id, user_id=current_user.id
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
        )
    return await channel_service.update(db, channel=channel, channel_in=channel_in)


@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    channel = await channel_service.get_by_id(db, channel_id=channel_id)
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    membership = await workspace_service.get_member(
        db, workspace_id=channel.workspace_id, user_id=current_user.id
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
        )
    await channel_service.delete(db, channel=channel)
    return Response(status_code=status.HTTP_204_NO_CONTENT)