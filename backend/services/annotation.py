from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.annotation import Annotation
from models.user import User
from schemas.annotation import AnnotationCreate, AnnotationExportItem, ExportPayload, AnnotationResponse


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


async def list_with_username(db: AsyncSession, video_id: str) -> list[AnnotationResponse]:
    annotations = await get_by_video(db, video_id)
    user_ids = [a.user_id for a in annotations if a.user_id]
    users_map: dict[str, str] = {}
    if user_ids:
        rows = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_map = {str(u.id): u.username for u in rows.scalars().all()}
    return [
        AnnotationResponse(
            **{c.key: getattr(a, c.key) for c in a.__table__.columns},
            username=users_map.get(str(a.user_id)),
        )
        for a in annotations
    ]


async def delete(db: AsyncSession, annotation_id: str) -> bool:
    result = await db.execute(select(Annotation).where(Annotation.id == annotation_id))
    annotation = result.scalar_one_or_none()
    if not annotation:
        return False
    await db.delete(annotation)
    await db.commit()
    return True


async def export_by_video(db: AsyncSession, video_id: str) -> ExportPayload:
    annotations = await get_by_video(db, video_id)
    return ExportPayload(
        video_id=video_id,
        exported_at=datetime.now(timezone.utc),
        annotations=[AnnotationExportItem.model_validate(a) for a in annotations],
    )


async def import_from_json(db: AsyncSession, payload: ExportPayload) -> list[Annotation]:
    created = []
    for item in payload.annotations:
        annotation = Annotation(
            video_id=payload.video_id,
            type=item.type,
            content=item.content,
            timestamp=item.timestamp,
            color=item.color,
            user_id=item.user_id,
        )
        db.add(annotation)
        created.append(annotation)
    await db.commit()
    for a in created:
        await db.refresh(a)
    return created
