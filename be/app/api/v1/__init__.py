from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    channels,
    direct_messages,
    files,
    health,
    messages,
    presence,
    users,
    workspaces,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(channels.router, prefix="/channels", tags=["Channels"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(direct_messages.router, prefix="/direct-messages", tags=["Direct Messages"])
api_router.include_router(presence.router, prefix="/presence", tags=["Presence"])
api_router.include_router(files.router, prefix="/files", tags=["Files"])
api_router.include_router(files.router)  # <-- This activates /api/v1/files/upload