import pytest
from app.db.models import Channel, Workspace
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_send_and_retrieve_channel_message(
    client: AsyncClient,
    auth_headers: dict[str, str],
    test_workspace: Workspace,
    db_session: AsyncSession,
) -> None:
    # Retrieve the default seeded channel
    result = await db_session.execute(
        select(Channel).where(Channel.workspace_id == test_workspace.id)
    )
    channel = result.scalars().first()
    assert channel is not None

    # Send message
    send_res = await client.post(
        "/api/v1/messages/",
        headers=auth_headers,
        json={
            "channel_id": channel.id,
            "content": "Automated test message sent via Pytest!",
        },
    )
    assert send_res.status_code == 201
    msg_data = send_res.json()
    assert msg_data["content"] == "Automated test message sent via Pytest!"

    # Read channel history
    history_res = await client.get(
        f"/api/v1/messages/channel/{channel.id}",
        headers=auth_headers,
    )
    assert history_res.status_code == 200
    messages = history_res.json()
    assert len(messages) >= 1
    message_ids = [m["id"] for m in messages]
    assert msg_data["id"] in message_ids