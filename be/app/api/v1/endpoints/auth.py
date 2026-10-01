from typing import Annotated, Any

from app.api.v1.dependencies import get_current_user, require_admin
from app.core.dependencies import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import Token, User, UserResponse
from app.services.user_service import user_service
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

MAX_MEMBERS_CAP = 7
MAX_ADMIN_BADGES = 2


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MemberRegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str = "SecurePassword123!"
    role: str = "member"


@router.post("/login", response_model=Token)
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    user = await user_service.get_by_email(db, email=payload.email.lower().strip())
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(subject=user.email)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Any:
    user = await user_service.get_by_email(db, email=form_data.username.lower().strip())
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(subject=user.email)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/register-member", response_model=UserResponse)
async def register_member(
    payload: MemberRegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> Any:
    clean_email = payload.email.lower().strip()
    if not clean_email.endswith("@connectteams.com"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email domain: Must end with @connectteams.com",
        )

    existing = await user_service.get_by_email(db, email=clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered with this email",
        )

    count_query = select(func.count()).select_from(User).where(User.email != "admin@connectteams.com")
    count_result = await db.execute(count_query)
    total_members = count_result.scalar_one()

    if total_members >= MAX_MEMBERS_CAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Capacity reached: Maximum {MAX_MEMBERS_CAP} member accounts allowed.",
        )

    role = "admin" if payload.role == "admin" else "member"
    if role == "admin":
        admin_count_query = select(func.count()).select_from(User).where(
            User.role == "admin",
            User.email != "admin@connectteams.com",
        )
        admin_result = await db.execute(admin_count_query)
        total_admins = admin_result.scalar_one()

        if total_admins >= MAX_ADMIN_BADGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Admin badge limit reached: Only {MAX_ADMIN_BADGES} members can hold an admin badge.",
            )

    new_user = User(
        email=clean_email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=role,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> Any:
    return current_user