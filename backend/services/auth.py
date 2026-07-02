import os
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.user import User
from schemas.auth import RegisterRequest

SECRET_KEY = os.getenv("JWT_SECRET", "changeme-in-production")
ALGORITHM = "HS256"
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 1440))  # 24h
KEY_TOKEN_EXPIRE_SECONDS = 60


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_key_token(user_id: str) -> str:
    """
    Token dédié à la récupération de la clé HLS, valable 60s seulement (scope=hls-key) —
    distinct du token de session (24h). Une clé de déchiffrement remise sur la seule foi
    du token de session normal ne serait pas "Zero-Trust" : ici, même un token de session
    volé ne donne pas un accès prolongé à la clé, il faut en re-demander un à chaque fois.
    """
    payload = {
        "sub": user_id,
        "scope": "hls-key",
        "exp": datetime.now(timezone.utc) + timedelta(seconds=KEY_TOKEN_EXPIRE_SECONDS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def register(db: AsyncSession, data: RegisterRequest) -> User:
    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


async def get_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def change_password(db: AsyncSession, user: User, current: str, new: str) -> bool:
    if not verify_password(current, user.hashed_password):
        return False
    user.hashed_password = hash_password(new)
    await db.commit()
    return True
