from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil

router = APIRouter(prefix="/api/videos", tags=["videos"])

UPLOAD_DIR = Path("uploads")
ALLOWED_TYPES = {"video/mp4", "video/webm", "video/ogg", "video/quicktime"}


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Format non supporté : {file.content_type}")

    dest = UPLOAD_DIR / file.filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"filename": file.filename, "url": f"/videos/{file.filename}"}


@router.get("/")
async def list_videos():
    files = [f.name for f in UPLOAD_DIR.iterdir() if f.is_file()]
    return [{"filename": f, "url": f"/videos/{f}"} for f in sorted(files)]
