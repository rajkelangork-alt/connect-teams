import enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# Re-export canonical User model from app.db.models if present, or define safely
try:
    from app.db.models import User
except (ImportError, AttributeError):
    try:
        from app.db.base import Base
    except (ImportError, AttributeError):
        from sqlalchemy.orm import declarative_base
        Base = declarative_base()

    from sqlalchemy import Boolean, Column, Integer, String

    class User(Base):
        __tablename__ = "users"
        id = Column(Integer, primary_key=True, index=True)
        email = Column(String, unique=True, index=True, nullable=False)
        hashed_password = Column(String, nullable=False)
        full_name = Column(String, nullable=False)
        role = Column(String, default="member")
        is_active = Column(Boolean, default=True)


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "member"
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None