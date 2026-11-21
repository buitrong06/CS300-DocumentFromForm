from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated
from urllib.parse import unquote

from fastapi import APIRouter, Body, Header, HTTPException, Response, status

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
from app.modules.templates.store import FormGenerationStore, RevisionConflict

DATA_DIR = Path(os.getenv("EXTRACT_FIELD_DATA_DIR", "./data"))
store = FormGenerationStore(DATA_DIR / "form-generations.sqlite3")
analyzer = DocxAnalyzer()
filler = DocxFiller()
preview_renderer = DocxPreviewRenderer()
ollama = OllamaSuggester()

router = APIRouter(prefix="/api/form-generations", tags=["form-generations"])


@router.post("", response_model=FormGeneration, status_code=status.HTTP_201_CREATED)
def create_form_generation(
    content: Annotated[
        bytes,
        Body(media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ],
    x_filename: Annotated[str | None, Header(alias="X-Filename")] = None,
) -> FormGeneration:
    filename = unquote(x_filename or "template.docx")
    if not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=422, detail="Upload a .docx file")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The DOCX file must be 25 MB or smaller")
    try:
        generation = analyzer.analyze(content, filename)
    except DocxAnalysisError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return store.create(generation, content)


@router.get("/{generation_id}", response_model=FormGeneration)
def get_form_generation(generation_id: str) -> FormGeneration:
    generation = store.get(generation_id)
    if generation is None:
        raise HTTPException(status_code=404, detail="Form generation not found")
    return generation


@router.get("/{generation_id}/source-preview", response_class=Response)
def get_source_preview(generation_id: str) -> Response:
    generation = store.get(generation_id)
    source = store.get_source(generation_id)
    if generation is None or source is None:
        raise HTTPException(status_code=404, detail="Form generation or source document not found")
    try:
        html = preview_renderer.render(source, generation)
    except DocxPreviewError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return Response(content=html, media_type="text/html; charset=utf-8")


@router.put("/{generation_id}", response_model=FormGeneration)
def update_form_generation(generation_id: str, patch: GenerationPatch) -> FormGeneration:
    try:
        generation = store.update(generation_id, patch)
    except RevisionConflict as exc:
        raise HTTPException(
            status_code=409, detail="This form changed elsewhere. Reload before saving."
        ) from exc
    if generation is None:
        raise HTTPException(status_code=404, detail="Form generation not found")
    return generation


@router.post("/{generation_id}/suggestions", response_model=SuggestionResponse)
def request_suggestions(generation_id: str, request: SuggestionRequest) -> SuggestionResponse:
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
def create_filled_document(generation_id: str, request: FillRequest) -> Response:
    generation = store.get(generation_id)
    source = store.get_source(generation_id)
    if generation is None or source is None:
        raise HTTPException(status_code=404, detail="Form generation or source document not found")
    try:
        output = filler.fill(source, generation, request)
    except DocxFillError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    filename = filler.output_filename(generation.filename)
    return Response(
        content=output,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
