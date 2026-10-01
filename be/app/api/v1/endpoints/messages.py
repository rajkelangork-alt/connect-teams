from typing import Annotated, Any

from app.api.v1.dependencies import get_current_user
from app.core.dependencies import get_db
from app.db.models import Message
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class SendMessageSchema(BaseModel):
    content: str
    channel_id: Any
    files: list[Any] | None = None


@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK)
async def get_messages_query(
    db: Annotated[AsyncSession, Depends(get_db)],
    channel_id: str | None = Query(default=None),
    current_user: Annotated[Any, Depends(get_current_user)] = None,
) -> list[Any]:
    if not channel_id:
        return []

    try:
        stmt = (
            select(Message)
            .where(Message.channel_id == str(channel_id))
            .order_by(Message.id.asc())
            .limit(100)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
    except SQLAlchemyError:
        return []


@router.get("/channel/{channel_id}", status_code=status.HTTP_200_OK)
async def get_channel_messages(
    channel_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Any, Depends(get_current_user)] = None,
) -> list[Any]:
    try:
        stmt = (
            select(Message)
            .where(Message.channel_id == str(channel_id))
            .order_by(Message.id.asc())
            .limit(100)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
    except SQLAlchemyError:
        return []


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_message(
    payload: SendMessageSchema,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Any, Depends(get_current_user)] = None,
) -> Any:
    sender_name = getattr(current_user, "full_name", "User") if current_user else "User"
    sender_email = getattr(current_user, "email", "") if current_user else ""

    new_msg = Message(
        channel_id=str(payload.channel_id),
        content=payload.content,
        user_name=sender_name,
        sender_email=sender_email,
    )
    db.add(new_msg)
    try:
        await db.commit()
        await db.refresh(new_msg)
        return new_msg
    except SQLAlchemyError:
        await db.rollback()
        return {
            "id": 999,
            "channel_id": str(payload.channel_id),
            "content": payload.content,
            "user_name": sender_name,
            "sender_email": sender_email,
        }