from __future__ import annotations

from pathlib import Path
from typing import Annotated
from urllib.parse import quote, unquote

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import CurrentUser
from app.modules.templates.bindings import BindingError
from app.modules.templates.lifecycle import (
    ContentCheckView,
    CreatePresetTemplateRequest,
    TemplateDraftView,
    TemplatePublishError,
    TemplateSummary,
    active_owner_id,
    create_preset_template,
    create_uploaded_template,
    fields_for_template,
    list_templates,
    owned_template,
    publish_template,
    save_field_review,
    template_view,
    test_fill,
)
from app.modules.templates.router import filler, preview_renderer
from app.modules.templates.schemas import FillRequest, GenerationPatch
from app.modules.templates.services.docx_analyzer import DocxAnalysisError
from app.modules.templates.services.docx_filler import DocxFillError
from app.modules.templates.services.docx_preview import DocxPreviewError
from app.modules.templates.store import DOCX_MEDIA_TYPE, RevisionConflict
from app.modules.validation.service import check_values

router = APIRouter(prefix="/api/templates", tags=["templates"])


def get_template_owner_id(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> int:
    with db.begin():
        owner_id = active_owner_id(db, user.id)
    if owner_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An active account is required",
        )
    return owner_id


def require_local_storage(settings: Settings) -> Path:
    if settings.storage_backend != "local":
        raise HTTPException(status_code=503, detail="PA04 currently requires local file storage")
    return Path(settings.storage_local_dir)


OwnerId = Annotated[int, Depends(get_template_owner_id)]
Database = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


@router.post(
    "/uploaded-docx",
    response_model=TemplateDraftView,
    status_code=status.HTTP_201_CREATED,
)
def create_uploaded_docx_template(
    content: Annotated[bytes, Body(media_type=DOCX_MEDIA_TYPE)],
    owner_id: OwnerId,
    db: Database,
    settings: AppSettings,
    x_filename: Annotated[str | None, Header(alias="X-Filename")] = None,
) -> TemplateDraftView:
    filename = unquote(x_filename or "template.docx")
    if "\x00" in filename or not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=422, detail="Upload a .docx file")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The DOCX file must be 25 MB or smaller")
    try:
        return create_uploaded_template(
            db,
            owner_id,
            require_local_storage(settings),
            content,
            filename,
        )
    except DocxAnalysisError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/from-preset", response_model=TemplateDraftView, status_code=status.HTTP_201_CREATED)
def create_preset_template_draft(
    request: CreatePresetTemplateRequest,
    owner_id: OwnerId,
    db: Database,
    settings: AppSettings,
) -> TemplateDraftView:
    try:
        return create_preset_template(db, owner_id, require_local_storage(settings), request)
    except TemplatePublishError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("", response_model=list[TemplateSummary])
def list_template_library(owner_id: OwnerId, db: Database) -> list[TemplateSummary]:
    with db.begin():
        return list_templates(db, owner_id)


@router.get("/{template_id}", response_model=TemplateDraftView)
def get_template(template_id: int, owner_id: OwnerId, db: Database) -> TemplateDraftView:
    with db.begin():
        row = owned_template(db, owner_id, template_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Template not found")
        template, artifact = row
        return template_view(db, template, artifact)


@router.get("/{template_id}/source-preview", response_class=Response)
def get_template_source_preview(
    template_id: int, owner_id: OwnerId, db: Database, settings: AppSettings
) -> Response:
    storage_dir = require_local_storage(settings)
    with db.begin():
        row = owned_template(db, owner_id, template_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Template not found")
        template, artifact = row
        view = template_view(db, template, artifact)
        if view.review is None:
            raise HTTPException(status_code=422, detail="Template has no field review")
        source_path = storage_dir / artifact.storage_key
    try:
        source = source_path.read_bytes()
        html = preview_renderer.render(source, view.review)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Template source document not found") from exc
    except DocxPreviewError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return Response(content=html, media_type="text/html; charset=utf-8")


@router.put("/{template_id}/field-review", response_model=TemplateDraftView)
def update_template_field_review(
    template_id: int,
    patch: GenerationPatch,
    owner_id: OwnerId,
    db: Database,
    settings: AppSettings,
) -> TemplateDraftView:
    try:
        saved = save_field_review(db, owner_id, require_local_storage(settings), template_id, patch)
    except BindingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RevisionConflict as exc:
        raise HTTPException(
            status_code=409, detail="This Template changed elsewhere. Reload before saving."
        ) from exc
    except TemplatePublishError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if saved is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return saved


@router.post("/{template_id}/test-fill")
def test_fill_template(
    template_id: int,
    request: FillRequest,
    owner_id: OwnerId,
    db: Database,
    settings: AppSettings,
) -> Response:
    try:
        result = test_fill(db, owner_id, require_local_storage(settings), template_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Template not found")
        generation, source = result
        output = filler.fill(source, generation, request)
    except TemplatePublishError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DocxFillError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    filename = quote(filler.output_filename(generation.filename), safe="")
    return Response(
        content=output,
        media_type=DOCX_MEDIA_TYPE,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )


@router.post("/{template_id}/test-check", response_model=ContentCheckView)
def test_check_template(
    template_id: int, request: FillRequest, owner_id: OwnerId, db: Database
) -> ContentCheckView:
    with db.begin():
        if owned_template(db, owner_id, template_id) is None:
            raise HTTPException(status_code=404, detail="Template not found")
        fields = fields_for_template(db, template_id)
        unknown = sorted(set(request.values) - {field.field_key for field in fields})
        if unknown:
            raise HTTPException(status_code=422, detail=f"Unknown Field keys: {', '.join(unknown)}")
        findings, gate = check_values(dict(request.values), fields)
        return ContentCheckView(
            checked_field_keys=[field.field_key for field in fields],
            findings=findings,
            gate=gate,
        )


@router.post("/{template_id}/publish", response_model=TemplateDraftView)
def publish_template_draft(template_id: int, owner_id: OwnerId, db: Database) -> TemplateDraftView:
    try:
        published = publish_template(db, owner_id, template_id)
    except TemplatePublishError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if published is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return published
