import pytest
from app.db.models import User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient, db_session: AsyncSession) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "StrongPassword123!",
            "full_name": "New Developer",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data


@pytest.mark.asyncio
async def test_login_and_token_generation(client: AsyncClient, test_user: User) -> None:
    # Test JSON login endpoint
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "tester@example.com",
            "password": "TestPassword123!",
        },
    )
    # If using OAuth2 form route instead, fall back to /access-token
    if response.status_code == 404 or response.status_code == 422:
        response = await client.post(
            "/api/v1/auth/login/access-token",
            data={
                "username": "tester@example.com",
                "password": "TestPassword123!",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_get_current_user_me(
    client: AsyncClient, auth_headers: dict[str, str], test_user: User
) -> None:
    response = await client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_user.id
    assert data["email"] == test_user.email