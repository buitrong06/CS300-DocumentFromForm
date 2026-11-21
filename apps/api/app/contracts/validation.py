from enum import StrEnum

from pydantic import Field, model_validator

from app.contracts._base import ContractModel, EntityId, Version


class FindingKind(StrEnum):
    REQUIRED = "required"
    AUTOMATIC_RULE = "automatic_rule"
    SEMANTIC_CRITERION = "semantic_criterion"


class FindingStatus(StrEnum):
    FAILED = "failed"
    WARNING = "warning"
    UNCERTAIN = "uncertain"
    PASSED = "passed"


class ValidationFinding(ContractModel):
    field_key: str = Field(min_length=1, max_length=255)
    kind: FindingKind
    status: FindingStatus
    code: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=2_000)
    criterion: str | None = Field(default=None, max_length=10_000)
    evidence_quote: str | None = Field(default=None, max_length=10_000)


class GateDecision(ContractModel):
    """Deterministic findings may block; semantic findings are warnings only."""

    final_export_allowed: bool
    submit_allowed: bool
    blocking_codes: list[str] = Field(default_factory=list)
    warning_codes: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def codes_cannot_be_both_blocking_and_warning(self) -> "GateDecision":
        if set(self.blocking_codes) & set(self.warning_codes):
            raise ValueError("a finding code cannot be both blocking and warning")
        return self


class ValidationResult(ContractModel):
    draft_id: EntityId
    draft_version: Version
    checked_field_keys: list[str]
    findings: list[ValidationFinding]
    gate: GateDecision

    @model_validator(mode="after")
    def only_deterministic_failures_can_block(self) -> "ValidationResult":
        blocking_candidates = {
            finding.code
            for finding in self.findings
            if finding.kind in {FindingKind.REQUIRED, FindingKind.AUTOMATIC_RULE}
            and finding.status is FindingStatus.FAILED
        }
        if not set(self.gate.blocking_codes).issubset(blocking_candidates):
            raise ValueError("blocking_codes may contain only failed deterministic findings")
        semantic_failures = [
            finding.code
            for finding in self.findings
            if finding.kind is FindingKind.SEMANTIC_CRITERION
            and finding.status is FindingStatus.FAILED
        ]
        if semantic_failures:
            raise ValueError("semantic findings must be warnings, uncertain, or passed")
        return self
