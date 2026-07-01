from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.annotation import AnnotationCreate, AnnotationResponse, ExportPayload
from services import annotation as annotation_service

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


@router.post("/", response_model=AnnotationResponse, status_code=201)
async def create(data: AnnotationCreate, db: AsyncSession = Depends(get_db)):
    return await annotation_service.create(db, data)


@router.get("/", response_model=list[AnnotationResponse])
async def list_by_video(video_id: str, db: AsyncSession = Depends(get_db)):
    return await annotation_service.list_with_username(db, video_id)


@router.delete("/{annotation_id}", status_code=204)
async def delete(annotation_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await annotation_service.delete(db, annotation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Annotation not found")


@router.get("/export", response_model=ExportPayload)
async def export(video_id: str, db: AsyncSession = Depends(get_db)):
    return await annotation_service.export_by_video(db, video_id)


@router.post("/import", response_model=list[AnnotationResponse], status_code=201)
async def import_json(payload: ExportPayload, db: AsyncSession = Depends(get_db)):
    return await annotation_service.import_from_json(db, payload)
