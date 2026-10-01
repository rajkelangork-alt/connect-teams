from collections.abc import AsyncIterator

import pytest
from app.core.dependencies import get_db
from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.models import (
    Channel,
    ChannelType,
    User,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)
from app.main import app
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session", autouse=True)
async def setup_test_db() -> AsyncIterator[None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    res = await db_session.execute(select(User).where(User.email == "tester@example.com"))
    user = res.scalar_one_or_none()
    if not user:
        user = User(
            email="tester@example.com",
            full_name="Tester User",
            hashed_password=get_password_hash("TestPassword123!"),
            is_active=True,
            is_superuser=False,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def test_workspace(db_session: AsyncSession, test_user: User) -> Workspace:
    res = await db_session.execute(select(Workspace).where(Workspace.slug == "test-workspace"))
    ws = res.scalar_one_or_none()
    if not ws:
        ws = Workspace(
            name="Test Workspace",
            slug="test-workspace",
            owner_id=test_user.id,
        )
        db_session.add(ws)
        await db_session.flush()

        member = WorkspaceMember(
            workspace_id=ws.id,
            user_id=test_user.id,
            role=WorkspaceRole.ADMIN,
        )
        channel = Channel(
            name="general",
            topic="General discussions",
            channel_type=ChannelType.PUBLIC,
            workspace_id=ws.id,
        )
        db_session.add_all([member, channel])
        await db_session.commit()
        await db_session.refresh(ws)
    return ws