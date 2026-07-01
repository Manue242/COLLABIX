from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from database import get_db
from schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, PasswordChangeRequest
from services import auth as auth_service
from dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await auth_service.register(db, data)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Email ou username déjà utilisé")


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.login(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    return TokenResponse(access_token=auth_service.create_token(str(user.id)))


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/password")
async def change_password(
    data: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = await auth_service.change_password(db, current_user, data.current_password, data.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    return {"message": "Mot de passe mis à jour"}
