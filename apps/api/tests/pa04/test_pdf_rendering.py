from __future__ import annotations

from io import BytesIO
from urllib.parse import quote

from docx import Document
from fastapi.testclient import TestClient

from app.modules.templates.schemas import CandidateStatus
from app.modules.templates.store import DOCX_MEDIA_TYPE


def renderable_docx_with_marker() -> bytes:
    document = Document()
    document.add_paragraph("Ngày ký: {{ngày ký}}")
    stream = BytesIO()
    document.save(stream)
    return stream.getvalue()


def published_template_and_draft(client: TestClient) -> tuple[int, int, str]:
    source = renderable_docx_with_marker()
    created = client.post(
        "/api/templates/uploaded-docx",
        content=source,
        headers={"Content-Type": DOCX_MEDIA_TYPE, "X-Filename": quote("preview.docx")},
    )
    assert created.status_code == 201, created.text
    template = created.json()
    candidate = dict(template["review"]["candidates"][0])
    candidate["status"] = CandidateStatus.ACCEPTED
    candidate["rules"] = {**candidate["rules"], "required": True}
    reviewed = client.put(
        f"/api/templates/{template['id']}/field-review",
        json={"revision": template["review"]["revision"], "candidates": [candidate]},
    )
    assert reviewed.status_code == 200, reviewed.text
    assert client.post(f"/api/templates/{template['id']}/publish").status_code == 200
    editor = client.post(
        f"/api/templates/{template['id']}/drafts", json={"title": "PDF preview"}
    )
    assert editor.status_code == 201, editor.text
    draft = editor.json()["draft"]
    save_payload = {
        "expected_version": draft["version"],
        "field_values": {candidate["id"]: "2026-11-15"},
    }
    saved = client.put(f"/api/drafts/{draft['id']}", json=save_payload)
    assert saved.status_code == 200, saved.text
    return template["id"], draft["id"], saved.json()["draft"]["version"]


def test_preview_and_final_pdf_export_share_immutable_artifact(client: TestClient) -> None:
    _, draft_id, version = published_template_and_draft(client)

    preview = client.post(
        f"/api/drafts/{draft_id}/renders/preview", json={"expected_version": version}
    )
    assert preview.status_code == 200, preview.text
    snapshot = preview.json()
    assert snapshot["format"] == "pdf"
    assert snapshot["purpose"] == "preview"
    preview_pdf = client.get(snapshot["content_url"])
    assert preview_pdf.status_code == 200
    assert preview_pdf.content.startswith(b"%PDF")

    exported = client.post(
        f"/api/drafts/{draft_id}/exports",
        json={"expected_version": version, "format": "pdf", "purpose": "final_export"},
    )
    assert exported.status_code == 200, exported.text
    assert exported.content.startswith(b"%PDF")
    assert exported.headers["x-artifact-sha256"] == snapshot["sha256"]
    assert "preview-final.pdf" in exported.headers["content-disposition"]
    assert exported.content == preview_pdf.content


def test_draft_pdf_export_is_visibly_marked(client: TestClient) -> None:
    _, draft_id, version = published_template_and_draft(client)

    response = client.post(
        f"/api/drafts/{draft_id}/exports",
        json={"expected_version": version, "format": "pdf", "purpose": "draft_export"},
    )

    assert response.status_code == 200, response.text
    assert response.content.startswith(b"%PDF")
    assert "draft" in response.headers["content-disposition"].casefold()
