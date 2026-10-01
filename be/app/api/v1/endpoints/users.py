from typing import Annotated

from app.core.dependencies import get_current_user, get_db
from app.db.models import User
from app.models.user import UserResponse, UserUpdate
from app.services.user_service import user_service
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def read_user_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return await user_service.update(db, db_user=current_user, user_in=user_in)