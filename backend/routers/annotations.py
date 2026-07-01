from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.annotation import AnnotationCreate, AnnotationResponse, AnnotationUpdate, ExportPayload
from services import annotation as annotation_service

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


@router.post("/", response_model=AnnotationResponse, status_code=201)
async def create(data: AnnotationCreate, db: AsyncSession = Depends(get_db)):
    return await annotation_service.create(db, data)


@router.get("/", response_model=list[AnnotationResponse])
async def list_by_video(video_id: str, db: AsyncSession = Depends(get_db)):
    return await annotation_service.get_by_video(db, video_id)


@router.patch("/{annotation_id}", response_model=AnnotationResponse)
async def update(
    annotation_id: str, data: AnnotationUpdate, db: AsyncSession = Depends(get_db)
):
    annotation = await annotation_service.update(db, annotation_id, data)
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return annotation


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
