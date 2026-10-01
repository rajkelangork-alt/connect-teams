import json
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.ws.events import WSEventType
from app.ws.manager import ws_manager
from app.ws.redis_bridge import redis_bridge

logger = logging.getLogger("connect_teams.ws")

ws_router = APIRouter(tags=["websockets"])


def decode_ws_token(token: str) -> str | None:
    """Decodes JWT token and extracts user identifier without throwing HTTP exceptions."""
    if not token:
        return None
    token = token.removeprefix("Bearer ").strip()
    try:
        secret_key = getattr(settings, "JWT_SECRET_KEY", getattr(settings, "SECRET_KEY", "secret"))
        algorithm = getattr(settings, "ALGORITHM", "HS256")
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[algorithm],
        )
        return str(payload.get("sub"))
    except JWTError as e:
        logger.warning(f"WebSocket token validation failed: {e}")
        return None


# 1. Channel-Level WebSocket (used by frontend chat view for real-time messages & typing)
@ws_router.websocket("/ws/channels/{channel_id}")
async def channel_ws_endpoint(
    websocket: WebSocket,
    channel_id: int,
    token: str = Query(default=""),
) -> None:
    user_id = decode_ws_token(token)
    if not user_id:
        logger.warning(f"Rejecting unauthorized WebSocket attempt on channel {channel_id}")
        await websocket.close(code=4003)
        return

    # Accept handshake
    await websocket.accept()
    await ws_manager.connect(websocket, user_id=user_id, channel_id=channel_id)
    logger.info(f"User {user_id} connected to channel {channel_id} via WebSocket")

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                payload = json.loads(raw_data)
            except json.JSONDecodeError:
                continue

            event_type = payload.get("type")

            # Ephemeral Typing Indicator
            if event_type == "typing":
                await ws_manager.broadcast_to_channel(
                    channel_id=channel_id,
                    message={
                        "type": "typing",
                        "user_name": payload.get("user_name", "Someone"),
                        "channel_id": channel_id,
                    },
                    sender_socket=websocket,
                )

            # Inbound Real-time Message Frame
            elif event_type in ("message", "new_message"):
                await ws_manager.broadcast_to_channel(
                    channel_id=channel_id,
                    message={
                        "type": "new_message",
                        "data": payload.get("data", payload),
                        "channel_id": channel_id,
                    },
                )

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel_id=channel_id)
        logger.info(f"User {user_id} disconnected from channel {channel_id}")
    except OSError as exc:
        logger.error(f"Error on channel {channel_id} WS: {exc}")
        ws_manager.disconnect(websocket, channel_id=channel_id)


# 2. Workspace-Level WebSocket (for global notifications, workspace presence, etc.)
@ws_router.websocket("/ws/workspaces/{workspace_id}")
async def workspace_ws_endpoint(
    websocket: WebSocket,
    workspace_id: int,
    token: str = Query(default=""),
) -> None:
    user_id = decode_ws_token(token)
    if not user_id:
        await websocket.close(code=4003)
        return

    await websocket.accept()
    await ws_manager.connect(websocket, user_id=user_id, workspace_id=workspace_id)

    # Publish online status
    try:
        await redis_bridge.publish_to_workspace(
            workspace_id,
            {
                "event": WSEventType.PRESENCE_CHANGE,
                "data": {"user_id": user_id, "status": "online"},
            },
        )
    except OSError:
        pass

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, workspace_id=workspace_id)
        try:
            await redis_bridge.publish_to_workspace(
                workspace_id,
                {
                    "event": WSEventType.PRESENCE_CHANGE,
                    "data": {"user_id": user_id, "status": "offline"},
                },
            )
        except OSError:
            pass