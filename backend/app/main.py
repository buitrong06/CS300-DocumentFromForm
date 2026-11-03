from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware

from app.models import FillRequest, FormGeneration, GenerationPatch, SuggestionRequest, SuggestionResponse
from app.services.docx_analyzer import DocxAnalysisError, DocxAnalyzer
from app.services.docx_filler import DocxFillError, DocxFiller
from app.services.ollama import OllamaSuggester
from app.services.docx_preview import DocxPreviewError, DocxPreviewRenderer
from app.store import FormGenerationStore, RevisionConflict

DATA_DIR = Path(os.getenv("EXTRACT_FIELD_DATA_DIR", "./data"))
store = FormGenerationStore(DATA_DIR / "form-generations.sqlite3")
analyzer = DocxAnalyzer()
filler = DocxFiller()
preview_renderer = DocxPreviewRenderer()
ollama = OllamaSuggester()

app = FastAPI(title="Extract Field API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/form-generations", response_model=FormGeneration, status_code=status.HTTP_201_CREATED)
async def create_form_generation(request: Request) -> FormGeneration:
    filename = unquote(request.headers.get("x-filename", "template.docx"))
    if not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=422, detail="Upload a .docx file")
    content = await request.body()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The DOCX file must be 25 MB or smaller")
    try:
        generation = analyzer.analyze(content, filename)
    except DocxAnalysisError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return store.create(generation, content)


@app.get("/api/form-generations/{generation_id}", response_model=FormGeneration)
def get_form_generation(generation_id: str) -> FormGeneration:
    generation = store.get(generation_id)
    if generation is None:
        raise HTTPException(status_code=404, detail="Form generation not found")
    return generation


@app.get("/api/form-generations/{generation_id}/source-preview", response_class=Response)
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


@app.put("/api/form-generations/{generation_id}", response_model=FormGeneration)
def update_form_generation(generation_id: str, patch: GenerationPatch) -> FormGeneration:
    try:
        generation = store.update(generation_id, patch)
    except RevisionConflict as exc:
        raise HTTPException(status_code=409, detail="This form changed elsewhere. Reload before saving.") from exc
    if generation is None:
        raise HTTPException(status_code=404, detail="Form generation not found")
    return generation


@app.post("/api/form-generations/{generation_id}/suggestions", response_model=SuggestionResponse)
async def request_suggestions(generation_id: str, request: SuggestionRequest) -> SuggestionResponse:
    generation = store.get(generation_id)
    if generation is None:
        raise HTTPException(status_code=404, detail="Form generation not found")
    selected = set(request.block_ids)
    blocks = [block for block in generation.blocks if not selected or block.id in selected]
    if not request.include_llm:
        return SuggestionResponse(provider="deterministic", diagnostics=["No new deterministic suggestion was produced."])
    return await ollama.suggest(blocks)


@app.post("/api/form-generations/{generation_id}/filled-document")
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
