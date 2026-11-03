import asyncio
from io import BytesIO
from zipfile import ZipFile

from starlette.requests import Request

from app import main
from app.models import CandidateStatus, FillRequest, GenerationPatch, SuggestionRequest
from app.store import FormGenerationStore
from app.tests.test_docx_analyzer import docx_with_body


async def request_with_body(body: bytes, filename: str) -> Request:
    sent = False

    async def receive() -> dict[str, object]:
        nonlocal sent
        if sent:
            return {"type": "http.disconnect"}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/form-generations",
            "headers": [(b"x-filename", filename.encode())],
        },
        receive,
    )


def test_upload_review_and_suggestion_workflow(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(main, "store", FormGenerationStore(tmp_path / "forms.sqlite3"))

    async def run() -> None:
        request = await request_with_body(
            docx_with_body("<w:p><w:r><w:t>Ngày: {{ngày ký}}</w:t></w:r></w:p>"),
            "mau.docx",
        )
        created = await main.create_form_generation(request)
        assert created.candidates[0].label == "ngày ký"
        candidate = created.candidates[0].model_copy(update={"status": CandidateStatus.ACCEPTED})
        saved = main.update_form_generation(
            created.id,
            GenerationPatch(revision=created.revision, candidates=[candidate]),
        )
        assert saved.status == "ready"
        assert saved.revision == 2
        response = main.create_filled_document(created.id, FillRequest(values={candidate.id: "15/11/2026"}))
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        with ZipFile(BytesIO(response.body)) as archive:
            document_xml = archive.read("word/document.xml").decode("utf-8")
        assert "15/11/2026" in document_xml
        assert "ngày ký" not in document_xml
        suggestions = await main.request_suggestions(created.id, SuggestionRequest(include_llm=True))
        assert suggestions.provider == "ollama_unavailable"

    asyncio.run(run())

