from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.video import Video

router = APIRouter(prefix="/api/videos", tags=["videos"])

UPLOAD_DIR = Path("uploads")
ALLOWED_TYPES = {"video/mp4", "video/webm", "video/ogg", "video/quicktime"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    description: str | None = Form(None),
    category: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
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

    video = Video(filename=file.filename, title=title, description=description, category=category)
    await db.merge(video)
    await db.commit()

    return {"filename": file.filename, "url": f"/videos/{file.filename}", "title": title, "description": description, "category": category}


@router.get("/")
async def list_videos(db: AsyncSession = Depends(get_db)):
    UPLOAD_DIR.mkdir(exist_ok=True)
    files = sorted(f.name for f in UPLOAD_DIR.iterdir() if f.is_file())

    rows = await db.execute(select(Video).where(Video.filename.in_(files)))
    meta = {v.filename: v for v in rows.scalars().all()}

    return [
        {
            "filename": f,
            "url": f"/videos/{f}",
            "title": meta[f].title if f in meta else None,
            "description": meta[f].description if f in meta else None,
            "category": meta[f].category if f in meta else None,
        }
        for f in files
    ]


@router.patch("/{filename}")
async def update_video(
    filename: str,
    title: str | None = Form(None),
    description: str | None = Form(None),
    category: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    if not (UPLOAD_DIR / filename).is_file():
        raise HTTPException(status_code=404, detail="Video not found")

    result = await db.execute(select(Video).where(Video.filename == filename))
    video = result.scalar_one_or_none()
    if not video:
        video = Video(filename=filename)
        db.add(video)

    if title is not None:
        video.title = title
    if description is not None:
        video.description = description
    if category is not None:
        video.category = category

    await db.commit()
    return {"filename": filename, "title": video.title, "description": video.description, "category": video.category}


@router.delete("/{filename}")
async def delete_video(filename: str, db: AsyncSession = Depends(get_db)):
    path = UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Video not found")
    path.unlink()

    result = await db.execute(select(Video).where(Video.filename == filename))
    video = result.scalar_one_or_none()
    if video:
        await db.delete(video)
        await db.commit()

    return {"deleted": filename}
