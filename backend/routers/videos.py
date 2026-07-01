from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil

router = APIRouter(prefix="/api/videos", tags=["videos"])

UPLOAD_DIR = Path("uploads")
ALLOWED_TYPES = {"video/mp4", "video/webm", "video/ogg", "video/quicktime"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Format non supporté : {file.content_type}")

    dest = UPLOAD_DIR / file.filename
    size = 0
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"Fichier trop volumineux (max {MAX_FILE_SIZE // (1024 * 1024)}MB)",
                )
            f.write(chunk)

    return {"filename": file.filename, "url": f"/videos/{file.filename}"}


@router.get("/")
async def list_videos():
    UPLOAD_DIR.mkdir(exist_ok=True)
    files = [f.name for f in UPLOAD_DIR.iterdir() if f.is_file()]
    return [{"filename": f, "url": f"/videos/{f}"} for f in sorted(files)]


@router.delete("/{filename}")
async def delete_video(filename: str):
    path = UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Video not found")
    path.unlink()
    return {"deleted": filename}
