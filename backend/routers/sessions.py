import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User
from routers.ws import get_room_users

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("/{video_id}/users")
async def list_connected_users(video_id: str, db: AsyncSession = Depends(get_db)):
    user_ids = get_room_users(video_id)

    # user_id vient du query param WS côté client — peut être un vrai UUID
    # utilisateur, ou "anonymous"/un email en fallback. On ne résout que les
    # UUID valides pour éviter une erreur SQL sur les autres.
    valid_ids = []
    for uid in user_ids:
        try:
            valid_ids.append(str(uuid.UUID(uid)))
        except (ValueError, AttributeError, TypeError):
            continue

    usernames: dict[str, str] = {}
    if valid_ids:
        rows = await db.execute(select(User).where(User.id.in_(valid_ids)))
        usernames = {str(u.id): u.username for u in rows.scalars().all()}

    return {"video_id": video_id, "users": user_ids, "usernames": usernames}
