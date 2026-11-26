from __future__ import annotations

from pathlib import Path
from typing import Annotated
from urllib.parse import quote, unquote

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.models import User
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import CurrentUser
from app.modules.templates.bindings import BindingError
from app.modules.templates.schemas import (
    FillRequest,
    FormGeneration,
    GenerationPatch,
    SuggestionRequest,
    SuggestionResponse,
)
from app.modules.templates.services.docx_analyzer import DocxAnalysisError, DocxAnalyzer
from app.modules.templates.services.docx_filler import DocxFiller, DocxFillError
from app.modules.templates.services.docx_preview import DocxPreviewError, DocxPreviewRenderer
from app.modules.templates.services.ollama import OllamaSuggester
from app.modules.templates.store import DOCX_MEDIA_TYPE, FormGenerationStore, RevisionConflict

analyzer = DocxAnalyzer()
filler = DocxFiller()
preview_renderer = DocxPreviewRenderer()
ollama = OllamaSuggester()

router = APIRouter(prefix="/api/form-generations", tags=["form-generations"])


def get_form_generation_store(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FormGenerationStore:
    if settings.storage_backend != "local":
        raise HTTPException(status_code=503, detail="Form generation requires local file storage")
    with db.begin():
        owner_id = db.scalar(select(User.id).where(User.firebase_uid == user.id, User.is_active))
    if owner_id is None:
        raise HTTPException(status_code=403, detail="An active account is required")
    return FormGenerationStore(db, owner_id, Path(settings.storage_local_dir))


GenerationStore = Annotated[FormGenerationStore, Depends(get_form_generation_store)]


@router.post("", response_model=FormGeneration, status_code=status.HTTP_201_CREATED)
def create_form_generation(
    content: Annotated[bytes, Body(media_type=DOCX_MEDIA_TYPE)],
    store: GenerationStore,
    x_filename: Annotated[str | None, Header(alias="X-Filename")] = None,
) -> FormGeneration:
    filename = unquote(x_filename or "template.docx")
    if "\x00" in filename or not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=422, detail="Upload a .docx file")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The DOCX file must be 25 MB or smaller")
    try:
        generation = analyzer.analyze(content, filename)
    except DocxAnalysisError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return store.create(generation, content)


@router.get("/{generation_id}", response_model=FormGeneration)
def get_form_generation(generation_id: str, store: GenerationStore) -> FormGeneration:
    generation = store.get(generation_id)
    if generation is None:
        raise HTTPException(status_code=404, detail="Form generation not found")
    return generation


@router.get("/{generation_id}/source-preview", response_class=Response)
def get_source_preview(generation_id: str, store: GenerationStore) -> Response:
    result = store.get_with_source(generation_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Form generation or source document not found")
    generation, source = result
    try:
        html = preview_renderer.render(source, generation)
    except DocxPreviewError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return Response(content=html, media_type="text/html; charset=utf-8")


@router.put("/{generation_id}", response_model=FormGeneration)
def update_form_generation(
    generation_id: str, patch: GenerationPatch, store: GenerationStore
) -> FormGeneration:
    try:
        generation = store.update(generation_id, patch)
    except BindingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RevisionConflict as exc:
        raise HTTPException(
            status_code=409, detail="This form changed elsewhere. Reload before saving."
        ) from exc
    if generation is None:
        raise HTTPException(status_code=404, detail="Form generation not found")
    return generation


@router.post("/{generation_id}/suggestions", response_model=SuggestionResponse)
def request_suggestions(
    generation_id: str, request: SuggestionRequest, store: GenerationStore
) -> SuggestionResponse:
    generation = store.get(generation_id)
    if generation is None:
        raise HTTPException(status_code=404, detail="Form generation not found")
    selected = set(request.block_ids)
    blocks = [block for block in generation.blocks if not selected or block.id in selected]
    if not request.include_llm:
        return SuggestionResponse(
            provider="deterministic", diagnostics=["No new deterministic suggestion was produced."]
        )
    return ollama.suggest(blocks)


@router.post("/{generation_id}/filled-document")
def create_filled_document(
    generation_id: str, request: FillRequest, store: GenerationStore
) -> Response:
    result = store.get_with_source(generation_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Form generation or source document not found")
    generation, source = result
    try:
        output = filler.fill(source, generation, request)
    except DocxFillError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    filename = filler.output_filename(generation.filename)
    encoded_filename = quote(filename, safe="")
    disposition = (
        f"attachment; filename*=UTF-8''{encoded_filename}"
        if encoded_filename != filename
        else f'attachment; filename="{filename}"'
    )
    return Response(
        content=output,
        media_type=DOCX_MEDIA_TYPE,
        headers={"Content-Disposition": disposition},
    )
