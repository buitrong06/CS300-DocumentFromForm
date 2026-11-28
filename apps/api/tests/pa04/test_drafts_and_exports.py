from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from zipfile import ZipFile

from docx import Document
from fastapi.testclient import TestClient

from app.modules.templates.schemas import CandidateStatus
from app.modules.templates.store import DOCX_MEDIA_TYPE


def renderable_docx_with_marker() -> bytes:
    document = Document()
    document.add_paragraph("Ngày ký: {{ngày ký}}")
    output = BytesIO()
    document.save(output)
    return output.getvalue()


def published_template(client: TestClient) -> tuple[int, str]:
    source = renderable_docx_with_marker()
    created = client.post(
        "/api/templates/uploaded-docx",
        content=source,
        headers={"Content-Type": DOCX_MEDIA_TYPE, "X-Filename": quote("export.docx")},
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
    published = client.post(f"/api/templates/{template['id']}/publish")
    assert published.status_code == 200, published.text
    return template["id"], candidate["id"]


def test_draft_autosave_final_gate_and_draft_docx_export(client: TestClient) -> None:
    template_id, field_key = published_template(client)
    created = client.post(f"/api/templates/{template_id}/drafts", json={"title": "Bản dự thảo"})
    assert created.status_code == 201, created.text
    editor = created.json()
    draft = editor["draft"]
    assert draft["version"] == 1

    blocked = client.post(
        f"/api/drafts/{draft['id']}/exports",
        json={"expected_version": 1, "format": "docx", "purpose": "final_export"},
    )
    assert blocked.status_code == 422
    assert blocked.json()["detail"]["gate"]["final_export_allowed"] is False

    saved = client.put(
        f"/api/drafts/{draft['id']}",
        json={"expected_version": 1, "field_values": {field_key: "2026-11-15"}},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["draft"]["version"] == 2

    stale = client.put(
        f"/api/drafts/{draft['id']}",
        json={"expected_version": 1, "field_values": {field_key: "2026-11-16"}},
    )
    assert stale.status_code == 409

    final_export = client.post(
        f"/api/drafts/{draft['id']}/exports",
        json={"expected_version": 2, "format": "docx", "purpose": "final_export"},
    )
    assert final_export.status_code == 200, final_export.text
    with ZipFile(BytesIO(final_export.content)) as archive:
        xml = archive.read("word/document.xml").decode("utf-8")
    assert "15/11/2026" in xml
    assert "2026-11-15" not in xml
    assert "BẢN NHÁP" not in xml


def test_draft_export_remains_available_and_is_marked(client: TestClient) -> None:
    template_id, _ = published_template(client)
    editor = client.post(
        f"/api/templates/{template_id}/drafts", json={"title": "Bản dự thảo"}
    ).json()
    draft = editor["draft"]

    response = client.post(
        f"/api/drafts/{draft['id']}/exports",
        json={"expected_version": draft["version"], "format": "docx", "purpose": "draft_export"},
    )

    assert response.status_code == 200, response.text
    with ZipFile(BytesIO(response.content)) as archive:
        xml = archive.read("word/document.xml").decode("utf-8")
    assert "BẢN NHÁP" in xml


def test_preview_remains_available_before_required_fields_are_complete(client: TestClient) -> None:
    template_id, _ = published_template(client)
    editor = client.post(
        f"/api/templates/{template_id}/drafts", json={"title": "Bản dự thảo"}
    ).json()
    draft = editor["draft"]

    response = client.post(
        f"/api/drafts/{draft['id']}/renders/preview",
        json={"expected_version": draft["version"]},
    )

    assert response.status_code == 200, response.text
    snapshot = response.json()
    assert snapshot["purpose"] == "preview"
    preview = client.get(snapshot["content_url"])
    assert preview.content.startswith(b"%PDF")


def test_missing_template_source_becomes_a_render_error(
    client: TestClient, tmp_path: Path
) -> None:
    template_id, _ = published_template(client)
    editor = client.post(
        f"/api/templates/{template_id}/drafts", json={"title": "Bản dự thảo"}
    ).json()
    draft = editor["draft"]
    storage_file = next((tmp_path / "storage").rglob("*.docx"))
    storage_file.unlink()

    response = client.post(
        f"/api/drafts/{draft['id']}/renders/preview",
        json={"expected_version": draft["version"]},
    )

    assert response.status_code == 422, response.text
    assert response.json()["detail"] == "The original template DOCX is unavailable"
