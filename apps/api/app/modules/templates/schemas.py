from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


def utc_now() -> datetime:
    return datetime.now(UTC)


class FieldType(StrEnum):
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"
    DATE = "date"
    NUMBER = "number"
    MONEY = "money"
    CHOICE = "choice"


class CandidateStatus(StrEnum):
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class DetectionMethod(StrEnum):
    MARKER = "marker"
    COMMENT = "comment"
    DOTTED_LINE = "dotted_line"
    UNDERSCORE = "underscore"
    EMPTY_TABLE_CELL = "empty_table_cell"
    CHECKBOX = "checkbox"
    VML_FIELD = "vml_field"
    BOXED_FIELD = "boxed_field"
    MANUAL = "manual"
    LLM = "llm"


class SourceLocation(BaseModel):
    """A text range in the normalized document model, never a mutable DOCX offset."""

    block_id: str
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    path: str
    excerpt: str

    @model_validator(mode="after")
    def valid_range(self) -> SourceLocation:
        if self.end < self.start:
            raise ValueError("source end must be at or after source start")
        return self


class Instruction(BaseModel):
    text: str = Field(min_length=1, max_length=10_000)
    source: SourceLocation | None = None


class ChoiceOption(BaseModel):
    value: str = Field(min_length=1, max_length=255)
    label: str = Field(min_length=1, max_length=255)


class FieldRules(BaseModel):
    required: bool = False
    min_length: int | None = Field(default=None, ge=0)
    max_length: int | None = Field(default=None, ge=1)
    minimum: float | None = None
    maximum: float | None = None
    decimal_places: int | None = Field(default=None, ge=0, le=6)
    currency: str | None = Field(default=None, min_length=3, max_length=3)

    @model_validator(mode="after")
    def valid_bounds(self) -> FieldRules:
        if (
            self.min_length is not None
            and self.max_length is not None
            and self.min_length > self.max_length
        ):
            raise ValueError("min_length cannot exceed max_length")
        if self.minimum is not None and self.maximum is not None and self.minimum > self.maximum:
            raise ValueError("minimum cannot exceed maximum")
        return self


class FieldCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    label: str = Field(min_length=1, max_length=255)
    type: FieldType = Field(default=FieldType.SHORT_TEXT)
    status: CandidateStatus = CandidateStatus.PROPOSED
    occurrences: list[SourceLocation] = Field(min_length=1)
    methods: list[DetectionMethod] = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    evidence: list[str] = Field(default_factory=list)
    instructions: list[Instruction] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    placeholder: str | None = Field(default=None, max_length=255)
    default_value: str | None = Field(default=None, max_length=10_000)
    options: list[ChoiceOption] = Field(default_factory=list)
    rules: FieldRules = Field(default_factory=FieldRules)
    section: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def choice_requires_options(self) -> FieldCandidate:
        if (
            self.type is FieldType.CHOICE
            and self.status is CandidateStatus.ACCEPTED
            and not self.options
        ):
            raise ValueError("an accepted choice field needs at least one option")
        return self


class DocumentBlock(BaseModel):
    id: str
    kind: Literal["paragraph", "table_cell", "header", "footer"]
    text: str
    path: str
    parent_table: str | None = None


class AnalysisWarning(BaseModel):
    code: str
    message: str
    block_id: str | None = None


class FormGeneration(BaseModel):
    id: str
    filename: str
    sha256: str
    status: Literal["analyzing", "needs_review", "ready", "failed"]
    revision: int = Field(ge=1)
    blocks: list[DocumentBlock] = Field(default_factory=list)
    candidates: list[FieldCandidate] = Field(default_factory=list)
    warnings: list[AnalysisWarning] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class GenerationPatch(BaseModel):
    revision: int = Field(ge=1)
    candidates: list[FieldCandidate]

    @model_validator(mode="after")
    def unique_candidate_ids(self) -> GenerationPatch:
        if len({candidate.id for candidate in self.candidates}) != len(self.candidates):
            raise ValueError("candidate IDs must be unique")
        return self


class SuggestionRequest(BaseModel):
    block_ids: list[str] = Field(default_factory=list)
    include_llm: bool = False


class FieldSuggestion(BaseModel):
    """An untrusted model proposal. It becomes a field only after creator review."""

    block_id: str
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    label: str = Field(min_length=1, max_length=255)
    type: FieldType
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(min_length=1, max_length=1_000)
    instruction: str | None = Field(default=None, max_length=10_000)

    @model_validator(mode="after")
    def valid_range(self) -> FieldSuggestion:
        if self.end <= self.start:
            raise ValueError("suggestion end must be after suggestion start")
        return self


class SuggestionResponse(BaseModel):
    provider: Literal["deterministic", "ollama_unavailable", "ollama"]
    suggestions: list[FieldSuggestion] = Field(default_factory=list)
    diagnostics: list[str] = Field(default_factory=list)


class FillRequest(BaseModel):
    """Values are keyed by immutable field IDs, so renamed labels stay safe."""

    values: dict[str, str] = Field(default_factory=dict)
