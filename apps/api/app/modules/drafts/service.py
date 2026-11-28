from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.models import DocumentDraft, DocumentTemplate, TemplateField
from app.modules.drafts.schemas import (
    DraftEditorView,
    DraftSavePayload,
    DraftSummary,
    DraftView,
)
from app.modules.templates.lifecycle import (
    TemplateFieldView,
    fields_for_template,
    template_field_view,
)
from app.modules.validation.service import validate_draft, validate_field


class DraftConflictError(Exception):
    pass


class DraftValidationError(ValueError):
    pass


def create_personal_draft(
    db: Session, owner_id: int, template_id: int, title: str
) -> DocumentDraft | None:
    with db.begin():
        template = db.scalar(
            select(DocumentTemplate)
            .where(
                DocumentTemplate.id == template_id,
                DocumentTemplate.owner_id == owner_id,
                DocumentTemplate.status == "published",
            )
            .with_for_update()
        )
        if template is None:
            return None
        draft = DocumentDraft(
            template_id=template.id,
            owner_id=owner_id,
            title=title,
            is_personal=True,
            field_values={},
            version=1,
        )
        db.add(draft)
        db.flush()
        return draft


def get_owned_draft(
    db: Session, owner_id: int, draft_id: int, *, for_update: bool = False
) -> tuple[DocumentDraft, DocumentTemplate] | None:
    query = (
        select(DocumentDraft, DocumentTemplate)
        .join(DocumentTemplate, DocumentDraft.template_id == DocumentTemplate.id)
        .where(
            DocumentDraft.id == draft_id,
            DocumentDraft.owner_id == owner_id,
            DocumentDraft.deleted_at.is_(None),
        )
    )
    if for_update:
        query = query.with_for_update(of=DocumentDraft)
    return db.execute(query).one_or_none()


def list_personal_drafts(db: Session, owner_id: int) -> list[DraftSummary]:
    with db.begin():
        rows = db.execute(
            select(DocumentDraft, DocumentTemplate.name)
            .join(DocumentTemplate, DocumentDraft.template_id == DocumentTemplate.id)
            .where(
                DocumentDraft.owner_id == owner_id,
                DocumentDraft.is_personal,
                DocumentDraft.deleted_at.is_(None),
            )
            .order_by(DocumentDraft.updated_at.desc(), DocumentDraft.id.desc())
        )
        return [
            DraftSummary(
                id=draft.id,
                template_id=draft.template_id,
                template_name=template_name,
                title=draft.title,
                version=draft.version,
                updated_at=draft.updated_at,
            )
            for draft, template_name in rows
        ]


def editor_view(db: Session, draft: DocumentDraft, template: DocumentTemplate) -> DraftEditorView:
    fields = fields_for_template(db, template.id)
    validation = validate_draft(draft, fields)
    required = [field for field in fields if field.is_required]
    unmet = {
        finding.field_key
        for finding in validation.findings
        if finding.code.startswith(("required.", "type."))
    }
    required_complete = sum(field.field_key not in unmet for field in required)
    return DraftEditorView(
        draft=DraftView(
            id=draft.id,
            template_id=draft.template_id,
            title=draft.title,
            is_personal=draft.is_personal,
            field_values={key: str(value) for key, value in draft.field_values.items()},
            version=draft.version,
            updated_at=draft.updated_at,
        ),
        template_name=template.name,
        fields=[TemplateFieldView.model_validate(template_field_view(field)) for field in fields],
        validation=validation,
        required_complete=required_complete,
        required_total=len(required),
    )


def get_editor_view(db: Session, owner_id: int, draft_id: int) -> DraftEditorView | None:
    with db.begin():
        row = get_owned_draft(db, owner_id, draft_id)
        if row is None:
            return None
        draft, template = row
        return editor_view(db, draft, template)


def save_draft(
    db: Session, owner_id: int, draft_id: int, payload: DraftSavePayload
) -> DraftEditorView | None:
    with db.begin():
        row = get_owned_draft(db, owner_id, draft_id, for_update=True)
        if row is None:
            return None
        draft, template = row
        if draft.version != payload.expected_version:
            raise DraftConflictError
        fields = fields_for_template(db, template.id)
        validate_payload_fields(fields, payload.field_values)
        draft.field_values = payload.field_values
        draft.version += 1
        draft.updated_at = datetime.now(UTC)
        db.flush()
        return editor_view(db, draft, template)


def validate_payload_fields(fields: list[TemplateField], values: dict[str, str]) -> None:
    field_by_key = {field.field_key: field for field in fields}
    unknown = sorted(set(values) - set(field_by_key))
    if unknown:
        raise DraftValidationError(f"Unknown Field keys: {', '.join(unknown)}")
    type_failures = [
        finding.message
        for field in fields
        for finding in validate_field(field, values.get(field.field_key)).copy()
        if finding.code.startswith("type.")
    ]
    if type_failures:
        raise DraftValidationError(" ".join(type_failures))
