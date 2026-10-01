import json
import logging

from fastapi import WebSocket

logger = logging.getLogger("connect_teams.ws_manager")


class ConnectionManager:
    def __init__(self) -> None:
        # Maps channel_id -> list of (websocket, user_id)
        self.channel_connections: dict[int, list[WebSocket]] = {}
        # Maps workspace_id -> list of (websocket, user_id)
        self.workspace_connections: dict[int, list[WebSocket]] = {}
        # Track user_id associated with each socket
        self.socket_users: dict[WebSocket, str] = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        channel_id: int | None = None,
        workspace_id: int | None = None,
    ) -> None:
        self.socket_users[websocket] = str(user_id)

        if channel_id is not None:
            if channel_id not in self.channel_connections:
                self.channel_connections[channel_id] = []
            self.channel_connections[channel_id].append(websocket)

        if workspace_id is not None:
            if workspace_id not in self.workspace_connections:
                self.workspace_connections[workspace_id] = []
            self.workspace_connections[workspace_id].append(websocket)

    def disconnect(
        self,
        websocket: WebSocket,
        channel_id: int | None = None,
        workspace_id: int | None = None,
    ) -> None:
        if websocket in self.socket_users:
            del self.socket_users[websocket]

        if channel_id is not None and channel_id in self.channel_connections:
            if websocket in self.channel_connections[channel_id]:
                self.channel_connections[channel_id].remove(websocket)
            if not self.channel_connections[channel_id]:
                del self.channel_connections[channel_id]

        if workspace_id is not None and workspace_id in self.workspace_connections:
            if websocket in self.workspace_connections[workspace_id]:
                self.workspace_connections[workspace_id].remove(websocket)
            if not self.workspace_connections[workspace_id]:
                del self.workspace_connections[workspace_id]

    async def broadcast_to_channel(
        self,
        channel_id: int,
        message: dict,
        sender_socket: WebSocket | None = None,
    ) -> None:
        connections = self.channel_connections.get(channel_id, [])
        serialized = json.dumps(message)
        for conn in list(connections):
            if conn == sender_socket:
                continue
            try:
                await conn.send_text(serialized)
            except OSError as exc:
                logger.debug(f"Failed to send to client socket: {exc}")
                self.disconnect(conn, channel_id=channel_id)


ws_manager = ConnectionManager()