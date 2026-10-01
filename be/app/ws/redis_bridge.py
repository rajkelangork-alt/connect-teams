import asyncio
import contextlib
import json
import logging
from typing import Any

import redis.asyncio as aioredis
from redis.exceptions import RedisError

from app.core.config import settings
from app.ws.manager import ws_manager

logger = logging.getLogger("connect_teams.redis_bridge")

REDIS_CHANNEL = "connect_teams_broadcast"


class RedisBridge:
    def __init__(self) -> None:
        self.redis_client: aioredis.Redis | None = None
        self.pubsub: aioredis.client.PubSub | None = None
        self.listener_task: asyncio.Task[None] | None = None

    async def connect(self) -> None:
        try:
            client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
            )
            pubsub = client.pubsub()
            await pubsub.subscribe(REDIS_CHANNEL)
            self.redis_client = client
            self.pubsub = pubsub
            self.listener_task = asyncio.create_task(self._listen())
            logger.info("Connected to Redis Pub/Sub on channel: %s", REDIS_CHANNEL)
        except (RedisError, OSError) as exc:
            logger.warning("Redis Pub/Sub connection failed, falling back to local mode: %s", exc)
            self.redis_client = None
            self.pubsub = None

    async def _listen(self) -> None:
        if not self.pubsub:
            return
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    payload: dict[str, Any] = json.loads(message["data"])
                    target = payload.get("target")
                    event_data = payload.get("data")

                    if target == "workspace":
                        workspace_id = payload.get("workspace_id")
                        if workspace_id and event_data:
                            await ws_manager.broadcast_to_workspace(int(workspace_id), event_data)

                    elif target == "channel":
                        channel_id = payload.get("channel_id")
                        if channel_id and event_data:
                            await ws_manager.broadcast_to_channel(int(channel_id), event_data)
        except asyncio.CancelledError:
            pass
        except (RedisError, json.JSONDecodeError) as exc:
            logger.error("Redis Pub/Sub listener error: %s", exc)

    async def publish_to_channel(self, channel_id: int, message: dict[str, Any]) -> None:
        if self.redis_client:
            payload = {
                "target": "channel",
                "channel_id": channel_id,
                "data": message,
            }
            with contextlib.suppress(RedisError, OSError):
                await self.redis_client.publish(REDIS_CHANNEL, json.dumps(payload))
                return
        await ws_manager.broadcast_to_channel(channel_id, message)

    async def publish_to_workspace(self, workspace_id: int, message: dict[str, Any]) -> None:
        if self.redis_client:
            payload = {
                "target": "workspace",
                "workspace_id": workspace_id,
                "data": message,
            }
            with contextlib.suppress(RedisError, OSError):
                await self.redis_client.publish(REDIS_CHANNEL, json.dumps(payload))
                return
        await ws_manager.broadcast_to_workspace(workspace_id, message)

    async def disconnect(self) -> None:
        if self.listener_task:
            self.listener_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.listener_task
        if self.pubsub:
            with contextlib.suppress(RedisError, OSError):
                await self.pubsub.unsubscribe(REDIS_CHANNEL)
                await self.pubsub.close()
        if self.redis_client:
            with contextlib.suppress(RedisError, OSError):
                await self.redis_client.close()
        logger.info("Redis Pub/Sub disconnected.")


redis_bridge = RedisBridge()