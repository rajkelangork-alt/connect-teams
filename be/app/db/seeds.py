import asyncio
import logging
from typing import TypedDict

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.models import (
    Channel,
    ChannelType,
    Message,
    User,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)
from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("connect_teams.seeds")


class UserSeed(TypedDict):
    email: str
    full_name: str
    password: str
    is_superuser: bool


class ChannelSeed(TypedDict):
    name: str
    topic: str


class WorkspaceSeed(TypedDict):
    name: str
    slug: str
    channels: list[ChannelSeed]


DEMO_USERS: list[UserSeed] = [
    {
        "email": "alex@example.com",
        "full_name": "Alex Morgan",
        "password": "SecurePassword123!",
        "is_superuser": True,
    },
    {
        "email": "sarah@example.com",
        "full_name": "Sarah Connor",
        "password": "Password123!",
        "is_superuser": False,
    },
    {
        "email": "john@example.com",
        "full_name": "John Doe",
        "password": "Password123!",
        "is_superuser": False,
    },
]

DEMO_WORKSPACES: list[WorkspaceSeed] = [
    {
        "name": "Acme Engineering",
        "slug": "acme-engineering",
        "channels": [
            {"name": "general", "topic": "Company-wide general announcements"},
            {"name": "backend", "topic": "FastAPI, PostgreSQL & architecture discussions"},
            {"name": "frontend", "topic": "React, Next.js & UI components"},
            {"name": "random", "topic": "Off-topic banter and coffee breaks"},
        ],
    }
]


async def seed_database() -> None:
    async with AsyncSessionLocal() as db:
        logger.info("Starting database seeding...")

        # 1. Seed Users
        created_users: dict[str, User] = {}
        for user_data in DEMO_USERS:
            email: str = user_data["email"]
            user_res = await db.execute(select(User).where(User.email == email))
            existing_user: User | None = user_res.scalar_one_or_none()

            if not existing_user:
                new_user = User(
                    email=email,
                    full_name=user_data["full_name"],
                    hashed_password=get_password_hash(user_data["password"]),
                    is_superuser=user_data["is_superuser"],
                    is_active=True,
                )
                db.add(new_user)
                await db.flush()
                created_users[email] = new_user
                logger.info("Created user: %s", email)
            else:
                created_users[email] = existing_user
                logger.info("User already exists: %s", email)

        owner_user: User = created_users["alex@example.com"]

        # 2. Seed Workspaces, Channels & Members
        for ws_data in DEMO_WORKSPACES:
            slug: str = ws_data["slug"]
            ws_res = await db.execute(select(Workspace).where(Workspace.slug == slug))
            existing_workspace: Workspace | None = ws_res.scalar_one_or_none()

            workspace: Workspace
            if not existing_workspace:
                workspace = Workspace(
                    name=ws_data["name"],
                    slug=slug,
                    owner_id=owner_user.id,
                )
                db.add(workspace)
                await db.flush()
                logger.info("Created workspace: %s", ws_data["name"])
            else:
                workspace = existing_workspace
                logger.info("Workspace already exists: %s", ws_data["name"])

            # Add all users as workspace members
            for member_email, usr in created_users.items():
                member_res = await db.execute(
                    select(WorkspaceMember).where(
                        WorkspaceMember.workspace_id == workspace.id,
                        WorkspaceMember.user_id == usr.id,
                    )
                )
                if not member_res.scalar_one_or_none():
                    role = WorkspaceRole.ADMIN if usr.id == owner_user.id else WorkspaceRole.MEMBER
                    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=usr.id, role=role))
                    logger.info("Added %s to %s as %s", member_email, workspace.name, role.value)

            # Seed Channels for Workspace
            seeded_channels: dict[str, Channel] = {}
            for ch_data in ws_data["channels"]:
                ch_name: str = ch_data["name"]
                ch_res = await db.execute(
                    select(Channel).where(
                        Channel.workspace_id == workspace.id,
                        Channel.name == ch_name,
                    )
                )
                existing_channel: Channel | None = ch_res.scalar_one_or_none()
                if not existing_channel:
                    channel = Channel(
                        name=ch_name,
                        topic=ch_data["topic"],
                        channel_type=ChannelType.PUBLIC,
                        workspace_id=workspace.id,
                    )
                    db.add(channel)
                    await db.flush()
                    seeded_channels[ch_name] = channel
                    logger.info("Created channel #%s in %s", ch_name, workspace.name)
                else:
                    seeded_channels[ch_name] = existing_channel

            # 3. Seed Starter Messages in #general
            general_ch = seeded_channels.get("general")
            if general_ch:
                msg_check = await db.execute(
                    select(Message).where(Message.channel_id == general_ch.id)
                )
                if not msg_check.scalars().first():
                    messages = [
                        Message(
                            channel_id=general_ch.id,
                            sender_id=owner_user.id,
                            content="Welcome everyone to Acme Engineering on Connect Teams! 🚀",
                        ),
                        Message(
                            channel_id=general_ch.id,
                            sender_id=created_users["sarah@example.com"].id,
                            content="Excited to be here! The real-time messaging latency is looking super sharp.",
                        ),
                        Message(
                            channel_id=general_ch.id,
                            sender_id=created_users["john@example.com"].id,
                            content="Checking in from backend. WebSocket pub/sub bridge is running smooth.",
                        ),
                    ]
                    db.add_all(messages)
                    logger.info("Seeded starter conversation into #general")

        await db.commit()
        logger.info("Database seeding successfully completed!")


if __name__ == "__main__":
    asyncio.run(seed_database())