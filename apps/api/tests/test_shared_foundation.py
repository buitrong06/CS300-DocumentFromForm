from datetime import UTC, datetime

import pytest
from pydantic import ValidationError
from sqlalchemy import CheckConstraint, ForeignKeyConstraint

from app.contracts import (
    ApplyRequest,
    FindingKind,
    FindingStatus,
    GateDecision,
    PublishedTemplate,
    PublishedTemplateField,
    RenderFormat,
    RenderPurpose,
    RenderRequest,
    RenderSourceType,
    SubmissionCreateRequest,
    TemplateFieldType,
    TemplateSourceType,
    ValidationFinding,
    ValidationResult,
)
from app.core.models import Base


def test_shared_metadata_contains_only_foundation_dependencies() -> None:
    expected = {"users", "workspaces", "workspace_members", "file_artifacts"}

    assert expected.issubset(Base.metadata.tables)

    members = Base.metadata.tables["workspace_members"]
    role_checks = {
        constraint.name
        for constraint in members.constraints
        if isinstance(constraint, CheckConstraint)
    }
    assert "ck_workspace_members_valid_role" in role_checks

    user_foreign_keys = [
        constraint
        for constraint in members.constraints
        if isinstance(constraint, ForeignKeyConstraint)
        and constraint.referred_table.name == "users"
    ]
    assert user_foreign_keys[0].ondelete == "RESTRICT"


def test_published_template_contract_uses_canonical_money_type() -> None:
    template = PublishedTemplate(
        id=10,
        slug="funding-request",
        name="Funding request",
        version=1,
        source_type=TemplateSourceType.UPLOADED_DOCX,
        source_artifact_id=20,
        fields=[
            PublishedTemplateField(
                id=30,
                field_key="total_budget",
                label="Tổng kinh phí",
                field_type=TemplateFieldType.AMOUNT_OF_MONEY,
                is_required=True,
                display_order=0,
            )
        ],
        published_at=datetime.now(UTC),
    )

    assert template.fields[0].field_type == "amount_of_money"


def test_rendering_a_draft_requires_an_optimistic_version() -> None:
    with pytest.raises(ValidationError, match="source_draft_version"):
        RenderRequest(
            source_type=RenderSourceType.DRAFT,
            source_id=1,
            format=RenderFormat.DOCX,
            purpose=RenderPurpose.PREVIEW,
        )


def test_submission_request_never_accepts_client_snapshot_values() -> None:
    with pytest.raises(ValidationError, match="field_values_snapshot"):
        SubmissionCreateRequest.model_validate(
            {
                "assignment_id": 1,
                "expected_draft_version": 2,
                "field_values_snapshot": {"title": "client-controlled"},
            }
        )


def test_apply_contract_requires_distinct_source_submissions() -> None:
    with pytest.raises(ValidationError, match="must be unique"):
        ApplyRequest(
            parent_draft_id=1,
            expected_parent_draft_version=2,
            target_template_field_id=3,
            value_after="combined result",
            apply_mode="combine",
            source_submission_ids=[10, 10],
        )


def test_validation_contract_carries_gate_and_scope() -> None:
    result = ValidationResult(
        draft_id=1,
        draft_version=2,
        checked_field_keys=["total_budget"],
        findings=[
            ValidationFinding(
                field_key="total_budget",
                kind=FindingKind.REQUIRED,
                status=FindingStatus.FAILED,
                code="required.total_budget",
                message="Tổng kinh phí là bắt buộc.",
            )
        ],
        gate=GateDecision(
            final_export_allowed=False,
            submit_allowed=False,
            blocking_codes=["required.total_budget"],
        ),
    )

    assert result.checked_field_keys == ["total_budget"]
    assert result.gate.blocking_codes == ["required.total_budget"]


def test_semantic_finding_cannot_be_a_blocker() -> None:
    with pytest.raises(ValidationError, match="semantic findings"):
        ValidationResult(
            draft_id=1,
            draft_version=2,
            checked_field_keys=["purpose"],
            findings=[
                ValidationFinding(
                    field_key="purpose",
                    kind=FindingKind.SEMANTIC_CRITERION,
                    status=FindingStatus.FAILED,
                    code="semantic.purpose",
                    message="Nội dung chưa đủ rõ.",
                )
            ],
            gate=GateDecision(
                final_export_allowed=True,
                submit_allowed=True,
            ),
        )
