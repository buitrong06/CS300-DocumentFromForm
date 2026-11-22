from datetime import datetime
from enum import StrEnum

from pydantic import model_validator

from app.contracts._base import ContractModel, EntityId, Version


class RenderSourceType(StrEnum):
    DRAFT = "draft"
    SUBMISSION = "submission"


class RenderFormat(StrEnum):
    DOCX = "docx"
    PDF = "pdf"


class RenderPurpose(StrEnum):
    PREVIEW = "preview"
    DRAFT_EXPORT = "draft_export"
    FINAL_EXPORT = "final_export"


class RenderRequest(ContractModel):
    source_type: RenderSourceType
    source_id: EntityId
    source_draft_version: Version | None = None
    format: RenderFormat
    purpose: RenderPurpose

    @model_validator(mode="after")
    def draft_source_requires_version(self) -> "RenderRequest":
        if self.source_type is RenderSourceType.DRAFT and self.source_draft_version is None:
            raise ValueError("source_draft_version is required when rendering a Draft")
        return self


class RenderSnapshot(ContractModel):
    id: EntityId
    source_type: RenderSourceType
    source_id: EntityId
    source_draft_version: Version | None = None
    format: RenderFormat
    purpose: RenderPurpose
    artifact_id: EntityId
    rendered_at: datetime

    @model_validator(mode="after")
    def draft_source_requires_version(self) -> "RenderSnapshot":
        if self.source_type is RenderSourceType.DRAFT and self.source_draft_version is None:
            raise ValueError("source_draft_version is required for a Draft snapshot")
        return self
