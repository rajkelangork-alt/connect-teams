import pytest
from app.db.models import Workspace
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_workspace(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    response = await client.post(
        "/api/v1/workspaces/",
        headers=auth_headers,
        json={"name": "Dev Squad"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Dev Squad"
    assert "slug" in data
    assert "id" in data


@pytest.mark.asyncio
async def test_list_workspaces(
    client: AsyncClient, auth_headers: dict[str, str], test_workspace: Workspace
) -> None:
    response = await client.get("/api/v1/workspaces/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check that test_workspace exists in the returned list
    workspace_ids = [ws["id"] for ws in data]
    assert test_workspace.id in workspace_ids


@pytest.mark.asyncio
async def test_create_channel_in_workspace(
    client: AsyncClient, auth_headers: dict[str, str], test_workspace: Workspace
) -> None:
    response = await client.post(
        f"/api/v1/channels/workspace/{test_workspace.id}",
        headers=auth_headers,
        json={
            "name": "qa-testing",
            "topic": "Automated regression testing",
            "channel_type": "public",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "qa-testing"
    assert data["workspace_id"] == test_workspace.id