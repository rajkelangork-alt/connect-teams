from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Message
from app.models.message import MessageCreate, MessageUpdate


class MessageService:
    @staticmethod
    async def get_by_id(db: AsyncSession, message_id: int) -> Message | None:
        result = await db.execute(
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.id == message_id)
        )
        return result.scalar_one_or_none()

    @classmethod
    async def create(
        cls, db: AsyncSession, message_in: MessageCreate, sender_id: int
    ) -> Message:
        message = Message(
            content=message_in.content,
            channel_id=message_in.channel_id,
            parent_id=message_in.parent_id,
            sender_id=sender_id,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)

        # Reload with sender relationship for schema validation
        return await cls.get_by_id(db, message_id=message.id)  # type: ignore

    @classmethod
    async def list_for_channel(
        cls,
        db: AsyncSession,
        channel_id: int,
        limit: int = 50,
        before_id: int | None = None,
    ) -> list[Message]:
        query = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.channel_id == channel_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        if before_id:
            query = query.where(Message.id < before_id)

        result = await db.execute(query)
        # Reverse to return chronological order (oldest -> newest)
        return list(reversed(result.scalars().all()))

    @classmethod
    async def update(
        cls, db: AsyncSession, message: Message, message_in: MessageUpdate
    ) -> Message:
        message.content = message_in.content
        await db.commit()
        await db.refresh(message)
        return await cls.get_by_id(db, message_id=message.id)  # type: ignore

    @classmethod
    async def delete(cls, db: AsyncSession, message: Message) -> None:
        await db.delete(message)
        await db.commit()


message_service = MessageService()