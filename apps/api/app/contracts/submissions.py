from datetime import datetime
from enum import StrEnum

from pydantic import Field, JsonValue, model_validator

from app.contracts._base import ContractModel, EntityId, Version
from app.contracts.validation import ValidationResult


class SubmissionCreateRequest(ContractModel):
    """The server snapshots the Draft; clients never provide snapshot field values."""

    assignment_id: EntityId
    expected_draft_version: Version


class SubmissionSnapshot(ContractModel):
    id: EntityId
    public_code: str = Field(min_length=1, max_length=255)
    task_id: EntityId
    assignment_id: EntityId
    submitted_by: EntityId
    template_id: EntityId
    source_draft_version: Version
    field_values_snapshot: dict[str, JsonValue]
    verification_summary: ValidationResult
    created_at: datetime


class ApplyMode(StrEnum):
    DIRECT = "direct"
    COMBINE = "combine"
    REWRITE = "rewrite"


class ApplyRequest(ContractModel):
    parent_draft_id: EntityId
    expected_parent_draft_version: Version
    target_template_field_id: EntityId
    value_after: JsonValue
    apply_mode: ApplyMode
    source_submission_ids: list[EntityId] = Field(min_length=1)

    @model_validator(mode="after")
    def sources_must_be_unique(self) -> "ApplyRequest":
        if len(set(self.source_submission_ids)) != len(self.source_submission_ids):
            raise ValueError("source_submission_ids must be unique")
        return self
