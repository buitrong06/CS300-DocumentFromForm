from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from app.contracts.validation import (
    FindingKind,
    FindingStatus,
    GateDecision,
    ValidationFinding,
    ValidationResult,
)
from app.core.models import DocumentDraft, TemplateField
from app.modules.drafts.rich_text import (
    RichTextError,
    rich_text_to_plain_text,
    validate_rich_text,
)


def validate_draft(
    draft: DocumentDraft, fields: list[TemplateField]
) -> ValidationResult:
    findings, gate = check_values(draft.field_values, fields)
    return ValidationResult(
        draft_id=draft.id,
        draft_version=draft.version,
        checked_field_keys=[field.field_key for field in fields],
        findings=findings,
        gate=gate,
    )


def check_values(
    values: dict[str, Any], fields: list[TemplateField]
) -> tuple[list[ValidationFinding], GateDecision]:
    """Run the deterministic content check on values that need not be persisted."""
    findings: list[ValidationFinding] = []
    for field in fields:
        findings.extend(validate_field(field, values.get(field.field_key)))

    blocking_codes = [
        finding.code
        for finding in findings
        if finding.kind in {FindingKind.REQUIRED, FindingKind.AUTOMATIC_RULE}
        and finding.status is FindingStatus.FAILED
    ]
    warning_codes = [
        finding.code
        for finding in findings
        if finding.status in {FindingStatus.WARNING, FindingStatus.UNCERTAIN}
    ]
    gate = GateDecision(
        final_export_allowed=not blocking_codes,
        submit_allowed=not blocking_codes,
        blocking_codes=blocking_codes,
        warning_codes=warning_codes,
    )
    return findings, gate


def visible_text(field_type: str, value: Any) -> str:
    """Return what a reader sees, so rules never measure rich-text JSON syntax."""
    text = value if isinstance(value, str) else "" if value is None else str(value)
    if field_type != "long_text":
        return text
    return rich_text_to_plain_text(validate_rich_text(text))


def validate_field(field: TemplateField, value: Any) -> list[ValidationFinding]:
    findings: list[ValidationFinding] = []
    try:
        text_value = visible_text(field.field_type, value)
    except RichTextError as exc:
        return [
            finding(
                field,
                FindingKind.AUTOMATIC_RULE,
                FindingStatus.FAILED,
                f"type.{field.field_key}",
                f"{field.label}: {exc}",
            )
        ]
    if field.is_required and not text_value.strip():
        findings.append(
            finding(
                field,
                FindingKind.REQUIRED,
                FindingStatus.FAILED,
                f"required.{field.field_key}",
                f"{field.label} là bắt buộc.",
            )
        )
        return findings
    if not text_value.strip():
        return findings

    type_error = type_error_for(field, text_value)
    if type_error is not None:
        findings.append(
            finding(
                field,
                FindingKind.AUTOMATIC_RULE,
                FindingStatus.FAILED,
                f"type.{field.field_key}",
                type_error,
            )
        )
        return findings

    for rule in field.automatic_rules:
        if not isinstance(rule, dict):
            continue
        rule_type = rule.get("rule_type")
        expected = rule.get("value")
        message = rule_failure_message(field, text_value, rule_type, expected)
        if message is not None:
            findings.append(
                finding(
                    field,
                    FindingKind.AUTOMATIC_RULE,
                    FindingStatus.FAILED,
                    f"rule.{field.field_key}.{rule_type}",
                    message,
                )
            )

    for criterion in field.semantic_criteria:
        if not isinstance(criterion, dict):
            continue
        description = criterion.get("description")
        if not isinstance(description, str) or not description.strip():
            continue
        findings.append(
            finding(
                field,
                FindingKind.SEMANTIC_CRITERION,
                FindingStatus.UNCERTAIN,
                f"semantic.{field.field_key}.{criterion.get('id', 'criterion')}",
                "Kiểm tra ngữ nghĩa chưa được cấu hình trong PA04; đây chỉ là cảnh báo.",
                criterion=description,
            )
        )
    return findings


def finding(
    field: TemplateField,
    kind: FindingKind,
    status: FindingStatus,
    code: str,
    message: str,
    *,
    criterion: str | None = None,
) -> ValidationFinding:
    return ValidationFinding(
        field_key=field.field_key,
        kind=kind,
        status=status,
        code=code,
        message=message,
        criterion=criterion,
    )


def type_error_for(field: TemplateField, value: str) -> str | None:
    if field.field_type == "date":
        try:
            date.fromisoformat(value)
        except ValueError:
            return f"{field.label} phải là ngày hợp lệ theo định dạng YYYY-MM-DD."
    if field.field_type in {"number", "amount_of_money"}:
        try:
            finite = Decimal(value).is_finite()
        except InvalidOperation:
            finite = False
        if not finite:
            return f"{field.label} phải là một số hợp lệ."
    if field.field_type == "choice":
        allowed = {
            str(option.get("value"))
            for option in field.choice_options
            if isinstance(option, dict) and option.get("value") is not None
        }
        if value not in allowed:
            return f"{field.label} phải là một lựa chọn được cấu hình."
    return None


def rule_failure_message(
    field: TemplateField, value: str, rule_type: object, expected: object
) -> str | None:
    if rule_type == "min_length" and isinstance(expected, int) and len(value) < expected:
        return f"{field.label} cần ít nhất {expected} ký tự."
    if rule_type == "max_length" and isinstance(expected, int) and len(value) > expected:
        return f"{field.label} không được quá {expected} ký tự."
    if rule_type in {"minimum", "maximum", "decimal_places"}:
        try:
            numeric = Decimal(value)
        except InvalidOperation:
            return None
        if rule_type == "minimum" and numeric < Decimal(str(expected)):
            return f"{field.label} phải lớn hơn hoặc bằng {expected}."
        if rule_type == "maximum" and numeric > Decimal(str(expected)):
            return f"{field.label} phải nhỏ hơn hoặc bằng {expected}."
        if rule_type == "decimal_places" and isinstance(expected, int):
            exponent = numeric.as_tuple().exponent
            decimal_places = max(0, -exponent) if isinstance(exponent, int) else 0
            if decimal_places > expected:
                return f"{field.label} chỉ được có tối đa {expected} chữ số thập phân."
    return None
