from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from collections import defaultdict

router = APIRouter(tags=["websocket"])

# video_id -> liste des connexions actives
rooms: dict[str, list[WebSocket]] = defaultdict(list)


@router.websocket("/ws/{video_id}")
async def collaborative_session(websocket: WebSocket, video_id: str):
    await websocket.accept()
    rooms[video_id].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            for ws in rooms[video_id]:
                if ws is not websocket:
                    await ws.send_text(data)
    except WebSocketDisconnect:
        rooms[video_id].remove(websocket)
