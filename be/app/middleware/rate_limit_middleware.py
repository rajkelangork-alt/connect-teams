import time
from collections import defaultdict
from collections.abc import Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120) -> None:
        super().__init__(app)
        self.rate_limit = requests_per_minute
        self.clients: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if (
            request.scope.get("type") == "websocket"
            or path.startswith(("/docs", "/redoc", "/openapi.json"))
            or path == "/favicon.ico"
        ):
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        current_time = time.time()
        window_start = current_time - 60.0

        self.clients[client_ip] = [
            timestamp for timestamp in self.clients[client_ip] if timestamp > window_start
        ]

        if len(self.clients[client_ip]) >= self.rate_limit:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down and try again in a minute."
                },
                headers={"Retry-After": "60"},
            )

        self.clients[client_ip].append(current_time)
        return await call_next(request)