from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AnnotationCreate(BaseModel):
    video_id: str
    type: str  # "comment" | "drawing"
    content: str
    timestamp: float
    color: str = "#ff0000"
    user_id: str | None = None


class AnnotationResponse(BaseModel):
    id: UUID
    video_id: str
    type: str
    content: str
    timestamp: float
    color: str
    user_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Export / Import ---

class AnnotationExportItem(BaseModel):
    id: UUID
    type: str
    content: str
    timestamp: float
    color: str
    user_id: str | None

    model_config = {"from_attributes": True}


class ExportPayload(BaseModel):
    version: str = "1.0"
    video_id: str
    exported_at: datetime
    annotations: list[AnnotationExportItem]
