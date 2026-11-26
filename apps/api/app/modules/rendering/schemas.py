from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.contracts.validation import ValidationResult


class PreviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_version: int = Field(ge=1)


class ExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_version: int = Field(ge=1)
    format: Literal["docx", "pdf"]
    purpose: Literal["draft_export", "final_export"]


class RenderSnapshotView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    draft_id: int
    source_draft_version: int
    format: Literal["docx", "pdf"]
    purpose: Literal["preview", "draft_export", "final_export"]
    artifact_id: int
    sha256: str
    filename: str
    rendered_at: datetime
    content_url: str


class ExportGateDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    validation: ValidationResult
