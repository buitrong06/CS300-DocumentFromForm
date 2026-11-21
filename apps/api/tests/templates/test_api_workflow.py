from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from pytest import MonkeyPatch

from app.modules.templates import router
from app.modules.templates.schemas import (
    CandidateStatus,
    FillRequest,
    GenerationPatch,
    SuggestionRequest,
)
from app.modules.templates.services.ollama import OllamaSuggester
from app.modules.templates.store import FormGenerationStore
from tests.templates.test_docx_analyzer import docx_with_body


def test_upload_review_and_suggestion_workflow(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setattr(router, "store", FormGenerationStore(tmp_path / "forms.sqlite3"))
    monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)
    monkeypatch.delenv("OLLAMA_MODEL", raising=False)
    monkeypatch.setattr(router, "ollama", OllamaSuggester())

    source = docx_with_body("<w:p><w:r><w:t>Ngày: {{ngày ký}}</w:t></w:r></w:p>")
    created = router.create_form_generation(source, "mau.docx")
    assert created.candidates[0].label == "ngày ký"

    candidate = created.candidates[0].model_copy(update={"status": CandidateStatus.ACCEPTED})
    saved = router.update_form_generation(
        created.id,
        GenerationPatch(revision=created.revision, candidates=[candidate]),
    )
    assert saved.status == "ready"
    assert saved.revision == 2

    response = router.create_filled_document(
        created.id,
        FillRequest(values={candidate.id: "15/11/2026"}),
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    with ZipFile(BytesIO(response.body)) as archive:
        document_xml = archive.read("word/document.xml").decode("utf-8")
    assert "15/11/2026" in document_xml
    assert "ngày ký" not in document_xml

    suggestions = router.request_suggestions(
        created.id,
        SuggestionRequest(include_llm=True),
    )
    assert suggestions.provider == "ollama_unavailable"
