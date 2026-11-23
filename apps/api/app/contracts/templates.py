from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import Field, JsonValue, model_validator

from app.contracts._base import ContractModel, EntityId, Version


class TemplateSourceType(StrEnum):
    PRESET = "preset"
    UPLOADED_DOCX = "uploaded_docx"


class TemplateFieldType(StrEnum):
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"
    DATE = "date"
    NUMBER = "number"
    AMOUNT_OF_MONEY = "amount_of_money"
    CHOICE = "choice"


class PublishedTemplateField(ContractModel):
    id: EntityId
    field_key: str = Field(min_length=1, max_length=255)
    label: str = Field(min_length=1, max_length=255)
    field_type: TemplateFieldType
    is_required: bool
    instructions: str = ""
    display_order: int = Field(ge=0)
    bindings: list[JsonValue] = Field(default_factory=list)
    automatic_rules: list[JsonValue] = Field(default_factory=list)
    semantic_criteria: list[JsonValue] = Field(default_factory=list)


class PublishedTemplate(ContractModel):
    """Stable handoff from Template authoring to Draft, Rendering, and Task slices."""

    id: EntityId
    slug: str = Field(min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    version: Version
    status: Literal["published"] = "published"
    source_type: TemplateSourceType
    preset_id: EntityId | None = None
    source_artifact_id: EntityId | None = None
    fields: list[PublishedTemplateField]
    published_at: datetime

    @model_validator(mode="after")
    def source_reference_matches_type(self) -> "PublishedTemplate":
        if self.source_type is TemplateSourceType.PRESET and self.preset_id is None:
            raise ValueError("preset_id is required for a preset-generated template")
        if (
            self.source_type is TemplateSourceType.UPLOADED_DOCX
            and self.source_artifact_id is None
        ):
            raise ValueError("source_artifact_id is required for an uploaded DOCX template")
        field_keys = [field.field_key for field in self.fields]
        if len(set(field_keys)) != len(field_keys):
            raise ValueError("published template field_key values must be unique")
        return self
