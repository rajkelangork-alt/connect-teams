from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import settings
from app.middleware.error_handler import GlobalExceptionHandlerMiddleware
from app.middleware.rate_limit_middleware import RateLimitMiddleware
from app.middleware.request_logger import RequestLoggerMiddleware
from app.ws.redis_bridge import redis_bridge
from app.ws.router import ws_router

# Ensure static upload destination directory exists
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Startup: connect to Redis Pub/Sub (gracefully falls back to local memory if offline)
    await redis_bridge.connect()
    yield
    # Shutdown: disconnect cleanly
    await redis_bridge.disconnect()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Custom Middlewares
app.add_middleware(GlobalExceptionHandlerMiddleware)
app.add_middleware(RequestLoggerMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS Configuration
allow_origins = getattr(settings, "BACKEND_CORS_ORIGINS", ["*"])
if isinstance(allow_origins, str):
    allow_origins = [origin.strip() for origin in allow_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://connect-teams-ashen.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for user uploads & image previews
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Route groups
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "message": "Connect Teams API is active. Go to /docs for interactive Swagger documentation."
    }