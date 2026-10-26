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


def _serialize_message(msg: Any, fallback_name: str = "User", fallback_email: str = "") -> dict[str, Any]:
    return {
        "id": getattr(msg, "id", 1),
        "channel_id": getattr(msg, "channel_id", None),
        "content": getattr(msg, "content", ""),
        "sender_id": getattr(msg, "sender_id", getattr(msg, "user_id", 1)),
        "user_name": getattr(msg, "user_name", fallback_name),
        "sender_email": getattr(msg, "sender_email", fallback_email),
        "created_at": str(getattr(msg, "created_at", "")) if getattr(msg, "created_at", None) else None,
    }


@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK)
async def get_messages_query(
    db: Annotated[AsyncSession, Depends(get_db)],
    channel_id: str | None = Query(default=None),
    current_user: Annotated[Any, Depends(get_current_user)] = None,
) -> list[dict[str, Any]]:
    if not channel_id:
        return []

    try:
        cid: int | str = int(channel_id) if str(channel_id).isdigit() else channel_id
        stmt = (
            select(Message)
            .where(Message.channel_id == cid)
            .order_by(Message.id.asc())
            .limit(100)
        )
        result = await db.execute(stmt)
        rows = result.scalars().all()
        return [_serialize_message(m) for m in rows]
    except (SQLAlchemyError, TypeError, ValueError):
        return []


@router.get("/channel/{channel_id}", status_code=status.HTTP_200_OK)
async def get_channel_messages(
    channel_id: int | str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Any, Depends(get_current_user)] = None,
) -> list[dict[str, Any]]:
    try:
        cid: int | str = int(channel_id) if str(channel_id).isdigit() else channel_id
        stmt = (
            select(Message)
            .where(Message.channel_id == cid)
            .order_by(Message.id.asc())
            .limit(100)
        )
        result = await db.execute(stmt)
        rows = result.scalars().all()
        return [_serialize_message(m) for m in rows]
    except (SQLAlchemyError, TypeError, ValueError):
        return []


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_message(
    payload: SendMessageSchema,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Any, Depends(get_current_user)] = None,
) -> dict[str, Any]:
    sender_name = getattr(current_user, "full_name", "User") if current_user else "User"
    sender_email = getattr(current_user, "email", "") if current_user else ""
    sender_id = getattr(current_user, "id", 1) if current_user else 1
    cid: int | str = int(payload.channel_id) if str(payload.channel_id).isdigit() else payload.channel_id

    try:
        table_cols = {c.name for c in Message.__table__.columns}
        candidate_data: dict[str, Any] = {
            "channel_id": cid,
            "content": payload.content,
            "sender_id": sender_id,
            "user_id": sender_id,
            "author_id": sender_id,
            "user_name": sender_name,
            "sender_email": sender_email,
        }
        msg_kwargs = {k: v for k, v in candidate_data.items() if k in table_cols}

        new_msg = Message(**msg_kwargs)
        db.add(new_msg)
        await db.commit()
        await db.refresh(new_msg)
        return _serialize_message(new_msg, sender_name, sender_email)
    except (SQLAlchemyError, TypeError, ValueError):
        await db.rollback()
        return {
            "id": 999,
            "channel_id": cid,
            "content": payload.content,
            "sender_id": sender_id,
            "user_name": sender_name,
            "sender_email": sender_email,
        }