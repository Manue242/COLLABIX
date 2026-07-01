import json
from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import TypeAdapter, ValidationError

from schemas.ws import WsMessage

router = APIRouter(tags=["websocket"])

rooms: dict[str, list[WebSocket]] = defaultdict(list)
room_users: dict[str, set[str]] = defaultdict(set)
_ws_user: dict[WebSocket, tuple[str, str]] = {}

_ws_adapter = TypeAdapter(WsMessage)


def get_room_users(video_id: str) -> list[str]:
    return sorted(room_users.get(video_id, set()))


async def _broadcast(video_id: str, message: str, sender: WebSocket | None = None) -> None:
    for ws in rooms[video_id]:
        if ws is not sender:
            await ws.send_text(message)


@router.websocket("/ws/{video_id}")
async def collaborative_session(
    websocket: WebSocket,
    video_id: str,
    user_id: str = Query(...),
):
    await websocket.accept()
    rooms[video_id].append(websocket)
    room_users[video_id].add(user_id)
    _ws_user[websocket] = (video_id, user_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = _ws_adapter.validate_json(raw)
                await _broadcast(video_id, message.model_dump_json(), sender=websocket)
            except (ValidationError, json.JSONDecodeError):
                await websocket.send_text(
                    json.dumps({"type": "error", "detail": "Invalid WebSocket message format"})
                )
    except WebSocketDisconnect:
        rooms[video_id].remove(websocket)
        room_users[video_id].discard(user_id)
        _ws_user.pop(websocket, None)
        if not rooms[video_id]:
            room_users.pop(video_id, None)
            rooms.pop(video_id, None)
