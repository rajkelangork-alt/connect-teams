from datetime import datetime, timezone
from typing import Annotated

from app.core.dependencies import get_current_user
from app.db.models import User
from app.models.presence import PresenceResponse, PresenceUpdate, UserStatus
from fastapi import APIRouter, Depends

router = APIRouter()


@router.get("/me", response_model=PresenceResponse)
async def get_my_presence(
    current_user: Annotated[User, Depends(get_current_user)],
) -> PresenceResponse:
    return PresenceResponse(
        user_id=current_user.id,
        status=UserStatus.ONLINE if current_user.is_active else UserStatus.OFFLINE,
        custom_status=None,
        last_active_at=datetime.now(timezone.utc),
    )


@router.put("/me", response_model=PresenceResponse)
async def update_my_presence(
    payload: PresenceUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
) -> PresenceResponse:
    return PresenceResponse(
        user_id=current_user.id,
        status=payload.status,
        custom_status=payload.custom_status,
        last_active_at=datetime.now(timezone.utc),
    )