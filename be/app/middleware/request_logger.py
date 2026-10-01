import logging
import time
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("connect_teams.access")
logging.basicConfig(level=logging.INFO)


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Pass WebSocket upgrades through without interfering with streaming handshakes
        if request.scope.get("type") == "websocket":
            return await call_next(request)

        start_time = time.perf_counter()
        response = await call_next(request)
        process_time_ms = (time.perf_counter() - start_time) * 1000

        client_host = request.client.host if request.client else "unknown"
        logger.info(
            "%s - \"%s %s\" %d (%.2fms)",
            client_host,
            request.method,
            request.url.path,
            response.status_code,
            process_time_ms,
        )
        response.headers["X-Process-Time"] = f"{process_time_ms:.2f}ms"
        return response