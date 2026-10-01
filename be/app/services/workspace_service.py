import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    Channel,
    ChannelType,
    User,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)
from app.models.workspace import WorkspaceCreate, WorkspaceUpdate
from app.utils.validators import slugify


class WorkspaceService:
    @staticmethod
    async def get_by_id(db: AsyncSession, workspace_id: int) -> Workspace | None:
        result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_slug(db: AsyncSession, slug: str) -> Workspace | None:
        result = await db.execute(select(Workspace).where(Workspace.slug == slug))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_member(
        db: AsyncSession, workspace_id: int, user_id: int
    ) -> WorkspaceMember | None:
        result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    @classmethod
    async def list_for_user(cls, db: AsyncSession, user_id: int) -> list[Workspace]:
        result = await db.execute(
            select(Workspace)
            .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
            .where(WorkspaceMember.user_id == user_id)
        )
        return list(result.scalars().all())

    @classmethod
    async def create(
        cls, db: AsyncSession, workspace_in: WorkspaceCreate, owner: User
    ) -> Workspace:
        base_slug = workspace_in.slug or slugify(workspace_in.name)
        slug = base_slug
        existing = await cls.get_by_slug(db, slug)
        if existing:
            slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

        workspace = Workspace(name=workspace_in.name, slug=slug, owner_id=owner.id)
        db.add(workspace)
        await db.flush()

        membership = WorkspaceMember(
            workspace_id=workspace.id, user_id=owner.id, role=WorkspaceRole.ADMIN
        )
        db.add(membership)

        default_channel = Channel(
            name="general",
            topic="General discussion",
            channel_type=ChannelType.PUBLIC,
            workspace_id=workspace.id,
        )
        db.add(default_channel)

        await db.commit()
        await db.refresh(workspace)
        return workspace

    @classmethod
    async def add_member(
        cls, db: AsyncSession, workspace_id: int, user: User, role: WorkspaceRole
    ) -> WorkspaceMember:
        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user.id,
            role=role,
        )
        db.add(member)
        await db.commit()
        await db.refresh(member)
        return member

    @classmethod
    async def list_members(cls, db: AsyncSession, workspace_id: int) -> list[WorkspaceMember]:
        result = await db.execute(
            select(WorkspaceMember)
            .options(selectinload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id)
        )
        return list(result.scalars().all())

    @classmethod
    async def update(
        cls, db: AsyncSession, workspace: Workspace, workspace_in: WorkspaceUpdate
    ) -> Workspace:
        update_data = workspace_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workspace, field, value)
        await db.commit()
        await db.refresh(workspace)
        return workspace


workspace_service = WorkspaceService()