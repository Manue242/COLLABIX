from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from database import Base


class Video(Base):
    __tablename__ = "videos"

    filename = Column(String, primary_key=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
