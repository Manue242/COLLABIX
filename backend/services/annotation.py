from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.annotation import Annotation
from schemas.annotation import AnnotationCreate


async def create(db: AsyncSession, data: AnnotationCreate) -> Annotation:
    annotation = Annotation(**data.model_dump())
    db.add(annotation)
    await db.commit()
    await db.refresh(annotation)
    return annotation


async def get_by_video(db: AsyncSession, video_id: str) -> list[Annotation]:
    result = await db.execute(
        select(Annotation)
        .where(Annotation.video_id == video_id)
        .order_by(Annotation.timestamp)
    )
    return result.scalars().all()


async def delete(db: AsyncSession, annotation_id: str) -> bool:
    result = await db.execute(select(Annotation).where(Annotation.id == annotation_id))
    annotation = result.scalar_one_or_none()
    if not annotation:
        return False
    await db.delete(annotation)
    await db.commit()
    return True
