from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, Field


class CursorMessage(BaseModel):
    type: Literal["cursor"]
    x: float
    y: float
    user_id: str


class AnnotationAddedMessage(BaseModel):
    type: Literal["annotation_added"]
    annotation: dict[str, Any]


class AnnotationDeletedMessage(BaseModel):
    type: Literal["annotation_deleted"]
    id: str


WsMessage = Annotated[
    Union[CursorMessage, AnnotationAddedMessage, AnnotationDeletedMessage],
    Field(discriminator="type"),
]
