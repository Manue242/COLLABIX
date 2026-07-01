from fastapi import APIRouter

from routers.ws import get_room_users

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("/{video_id}/users")
async def list_connected_users(video_id: str):
    return {"video_id": video_id, "users": get_room_users(video_id)}
