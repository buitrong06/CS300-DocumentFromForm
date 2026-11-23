from datetime import datetime

from pydantic import Field, JsonValue

from app.contracts._base import ContractModel, EntityId, Version


class DraftState(ContractModel):
    """Mutable working-copy state; version is the optimistic-lock token."""

    id: EntityId
    template_id: EntityId
    owner_id: EntityId
    title: str = Field(min_length=1, max_length=500)
    is_personal: bool
    field_values: dict[str, JsonValue] = Field(default_factory=dict)
    version: Version
    updated_at: datetime


class DraftSaveRequest(ContractModel):
    expected_version: Version
    field_values: dict[str, JsonValue]


class DraftSaveResult(ContractModel):
    draft: DraftState
