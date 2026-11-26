from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.contracts.validation import ValidationResult
from app.modules.templates.lifecycle import TemplateFieldView


class CreateDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=500)


class DraftSavePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_version: int = Field(ge=1)
    field_values: dict[str, str] = Field(default_factory=dict)


class DraftView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    template_id: int
    title: str
    is_personal: bool
    field_values: dict[str, str]
    version: int
    updated_at: datetime


class DraftSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    template_id: int
    template_name: str
    title: str
    version: int
    updated_at: datetime


class DraftEditorView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft: DraftView
    template_name: str
    fields: list[TemplateFieldView]
    validation: ValidationResult
    required_complete: int
    required_total: int
