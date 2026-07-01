from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response

from dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/api/video", tags=["hls"])

KEY_PATH = Path("media/secrets/video.key")
RATE_LIMIT = 10  # requêtes max par minute par user

_request_log: dict[str, list[datetime]] = defaultdict(list)


def _check_rate_limit(user_id: str) -> None:
    now = datetime.now(timezone.utc)
    window = [t for t in _request_log[user_id] if (now - t).total_seconds() < 60]
    _request_log[user_id] = window
    if len(window) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail=f"Trop de requêtes — max {RATE_LIMIT}/min")
    _request_log[user_id].append(now)


@router.get("/key")
async def get_hls_key(current_user: User = Depends(get_current_user)) -> Response:
    _check_rate_limit(str(current_user.id))
    if not KEY_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Clé HLS introuvable — exécuter generate-key.ps1 d'abord",
        )
    return Response(content=KEY_PATH.read_bytes(), media_type="application/octet-stream")
