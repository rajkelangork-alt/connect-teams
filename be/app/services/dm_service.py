from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Channel, ChannelType, Message, WorkspaceMember


class DMService:
    @classmethod
    async def get_or_create_dm_channel(
        cls, db: AsyncSession, workspace_id: int, user1_id: int, user2_id: int
    ) -> Channel:
        members = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id.in_([user1_id, user2_id]),
            )
        )
        if len(members.scalars().all()) < 2 and user1_id != user2_id:
            raise ValueError("Both users must be members of the workspace")

        dm_name = f"dm-{min(user1_id, user2_id)}-{max(user1_id, user2_id)}"

        result = await db.execute(
            select(Channel).where(
                Channel.workspace_id == workspace_id,
                Channel.name == dm_name,
                Channel.channel_type == ChannelType.DIRECT,
            )
        )
        channel = result.scalar_one_or_none()
        if not channel:
            channel = Channel(
                name=dm_name,
                topic="Direct Message",
                channel_type=ChannelType.DIRECT,
                workspace_id=workspace_id,
            )
            db.add(channel)
            await db.commit()
            await db.refresh(channel)
        return channel

    @classmethod
    async def send_dm(
        cls, db: AsyncSession, workspace_id: int, sender_id: int, recipient_id: int, content: str
    ) -> Message:
        channel = await cls.get_or_create_dm_channel(db, workspace_id, sender_id, recipient_id)
        msg = Message(
            channel_id=channel.id,
            sender_id=sender_id,
            content=content,
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)

        res = await db.execute(
            select(Message).options(selectinload(Message.sender)).where(Message.id == msg.id)
        )
        return res.scalar_one()


dm_service = DMService()