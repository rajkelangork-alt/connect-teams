from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Channel
from app.models.channel import ChannelCreate, ChannelUpdate


class ChannelService:
    @staticmethod
    async def get_by_id(db: AsyncSession, channel_id: int) -> Channel | None:
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_for_workspace(db: AsyncSession, workspace_id: int) -> list[Channel]:
        result = await db.execute(
            select(Channel).where(Channel.workspace_id == workspace_id)
        )
        return list(result.scalars().all())

    @classmethod
    async def create(
        cls, db: AsyncSession, workspace_id: int, channel_in: ChannelCreate
    ) -> Channel:
        channel = Channel(
            name=channel_in.name,
            topic=channel_in.topic,
            channel_type=channel_in.channel_type,
            workspace_id=workspace_id,
        )
        db.add(channel)
        await db.commit()
        await db.refresh(channel)
        return channel

    @classmethod
    async def update(
        cls, db: AsyncSession, channel: Channel, channel_in: ChannelUpdate
    ) -> Channel:
        update_data = channel_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(channel, field, value)
        await db.commit()
        await db.refresh(channel)
        return channel

    @classmethod
    async def delete(cls, db: AsyncSession, channel: Channel) -> None:
        await db.delete(channel)
        await db.commit()


channel_service = ChannelService()