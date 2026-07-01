import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # "comment" | "drawing"
    content = Column(Text, nullable=False)  # texte ou JSON (formes)
    timestamp = Column(Float, nullable=False)  # position dans la vidéo (secondes)
    color = Column(String, default="#ff0000")
    user_id = Column(String, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
