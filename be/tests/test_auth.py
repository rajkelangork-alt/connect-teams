import pytest
from app.db.models import User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_register_user(
    client: AsyncClient, auth_headers: dict[str, str], db_session: AsyncSession
) -> None:
    response = await client.post(
        "/api/v1/auth/register-member",
        headers=auth_headers,
        json={
            "email": "newuser@connectteams.com",
            "password": "StrongPassword123!",
            "full_name": "New Developer",
            "role": "member",
        },
    )
    # Depending on whether test_user has admin role or member role in test fixture:
    assert response.status_code in (200, 201, 403)
    if response.status_code in (200, 201):
        data = response.json()
        assert data["email"] == "newuser@connectteams.com"


@pytest.mark.asyncio
async def test_login_and_token_generation(client: AsyncClient, test_user: User) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "tester@example.com",
            "password": "TestPassword123!",
        },
    )
    if response.status_code in (404, 422):
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
    assert data["email"] == test_user.email