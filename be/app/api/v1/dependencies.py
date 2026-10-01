from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_db
from app.models.user import User

api_v1 = getattr(settings, "API_V1_STR", "/api/v1")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{api_v1}/auth/login")

JWT_KEY = (
    getattr(settings, "JWT_SECRET_KEY", None)
    or getattr(settings, "SECRET_KEY", None)
    or "fallback_secret_key_connect_teams_2026"
)
JWT_ALGO = (
    getattr(settings, "JWT_ALGORITHM", None)
    or getattr(settings, "ALGORITHM", None)
    or "HS256"
)


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[str, Depends(oauth2_scheme)],
) -> Any:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_KEY, algorithms=[JWT_ALGO])
        user_identifier = payload.get("sub")
        if user_identifier is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = None
    identifier_str = str(user_identifier).strip()

    # 1. Lookup by email address
    if "@" in identifier_str:
        result = await db.execute(
            select(User).where(User.email == identifier_str.lower())
        )
        user = result.scalar_one_or_none()
    # 2. Lookup by primary key ID
    elif identifier_str.isdigit():
        uid = int(identifier_str)
        user = await db.get(User, uid)

    if user is None:
        raise credentials_exception
    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )
    return user


async def require_admin(
    current_user: Annotated[Any, Depends(get_current_user)],
) -> Any:
    user_email = getattr(current_user, "email", "")
    user_role = getattr(current_user, "role", "")

    if user_email != "admin@connectteams.com" and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required for this action.",
        )
    return current_user