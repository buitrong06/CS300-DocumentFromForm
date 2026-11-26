"""Regression tests for gaps between UC-A02/A03/A05/A06/A09 and the first PA04 slice."""

from __future__ import annotations

import json
import threading
from io import BytesIO
from typing import Any, cast
from urllib.parse import quote
from zipfile import ZipFile

import pytest
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt
from fastapi.testclient import TestClient
from lxml import etree

from app.core.config import Settings
from app.core.models import TemplateField
from app.modules.drafts.rich_text import (
    RichTextError,
    rich_text_to_word_runs,
    validate_rich_text,
)
from app.modules.rendering import service as rendering_service
from app.modules.rendering.service import mark_as_draft
from app.modules.templates.lifecycle import build_supported_preset_docx
from app.modules.templates.schemas import CandidateStatus, FieldType, FillRequest
from app.modules.templates.services.docx_analyzer import NS, DocxAnalyzer
from app.modules.templates.services.docx_filler import DocxFiller
from app.modules.templates.store import DOCX_MEDIA_TYPE
from app.modules.validation.service import validate_field


def doc_json(*blocks: dict[str, Any]) -> str:
    return json.dumps({"type": "doc", "content": list(blocks)}, ensure_ascii=False)


def paragraph(text: str) -> dict[str, Any]:
    return {"type": "paragraph", "content": [{"type": "text", "text": text}]}


def ordered_list(start: int, *texts: str) -> dict[str, Any]:
    # Exactly what editor.getJSON() emits for StarterKit's orderedList.
    return {
        "type": "orderedList",
        "attrs": {"start": start, "type": None},
        "content": [{"type": "listItem", "content": [paragraph(text)]} for text in texts],
    }


def field(field_type: str, rules: list[dict[str, Any]] | None = None) -> TemplateField:
    return TemplateField(
        template_id=1,
        field_key="f",
        label="F",
        field_type=field_type,
        is_required=False,
        automatic_rules=rules or [],
        semantic_criteria=[],
        choice_options=[],
    )


def test_accepts_ordered_list_attributes_emitted_by_the_real_editor() -> None:
    runs = rich_text_to_word_runs(validate_rich_text(doc_json(ordered_list(3, "A", "B"))))

    assert "".join(run.text for run in runs) == "3. A\n4. B"


@pytest.mark.parametrize(
    "attrs",
    [{"start": 0}, {"start": "1"}, {"start": 1, "type": "a"}, {"start": 1, "style": "x"}],
)
def test_rejects_unsupported_ordered_list_attributes(attrs: dict[str, Any]) -> None:
    block = {**ordered_list(1, "A"), "attrs": attrs}

    with pytest.raises(RichTextError):
        validate_rich_text(doc_json(block))


@pytest.mark.parametrize(
    ("rule", "text", "fails"),
    [("min_length", "ab", True), ("max_length", "ab", False)],
)
def test_long_text_length_rules_measure_visible_text(rule: str, text: str, fails: bool) -> None:
    findings = validate_field(
        field("long_text", [{"rule_type": rule, "value": 20}]), doc_json(paragraph(text))
    )

    assert bool(findings) is fails


def test_malformed_rich_text_is_a_type_finding() -> None:
    findings = validate_field(field("long_text"), "{broken")

    assert [finding.code for finding in findings] == ["type.f"]


@pytest.mark.parametrize("value", ["NaN", "Infinity", "-inf"])
def test_non_finite_numbers_are_type_errors(value: str) -> None:
    findings = validate_field(field("number", [{"rule_type": "minimum", "value": 0}]), value)

    assert [finding.code for finding in findings] == ["type.f"]


def test_blank_org_constants_fall_back_to_visible_placeholders() -> None:
    source = build_supported_preset_docx(
        "to_trinh", {"governing_org": "", "issuing_org": "  ", "signer_title": ""}
    )

    text = [item.text for item in Document(BytesIO(source)).paragraphs]
    assert text[:2] == ["CƠ QUAN CHỦ QUẢN", "CƠ QUAN BAN HÀNH"]
    assert text[-1] == "NGƯỜI KÝ"


def assert_run_properties_in_schema_order(root: etree._Element) -> None:
    order = ["rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "color", "sz", "szCs", "u"]
    for properties in root.iterfind(".//w:rPr", NS):
        names = [etree.QName(child).localname for child in properties]
        known = [order.index(name) for name in names if name in order]
        assert known == sorted(known), names


def document_root(payload: bytes) -> etree._Element:
    with ZipFile(BytesIO(payload)) as archive:
        return etree.fromstring(archive.read("word/document.xml"))


def test_rich_text_runs_keep_word_schema_order() -> None:
    document = Document()
    run = document.add_paragraph().add_run("{{Nội dung}}")
    run.font.name = "Times New Roman"
    run.font.size = 177800
    stream = BytesIO()
    document.save(stream)
    generation = DocxAnalyzer().analyze(stream.getvalue(), "t.docx")
    candidate = generation.candidates[0].model_copy(
        update={"status": CandidateStatus.ACCEPTED, "type": FieldType.LONG_TEXT}
    )
    generation.candidates = [candidate]
    value = doc_json(
        {
            "type": "paragraph",
            "content": [
                {"type": "text", "text": "x", "marks": [{"type": "italic"}, {"type": "bold"}]}
            ],
        }
    )

    output = DocxFiller().fill(
        stream.getvalue(), generation, FillRequest(values={candidate.id: value})
    )

    assert_run_properties_in_schema_order(document_root(output))


def test_draft_mark_is_the_first_thing_in_the_document() -> None:
    document = Document()
    document.add_paragraph("Nội dung")
    stream = BytesIO()
    document.save(stream)

    root = document_root(mark_as_draft(stream.getvalue()))

    first = root.find("w:body", NS)[0]  # type: ignore[index]
    assert "".join(str(text) for text in first.itertext()) == "BẢN NHÁP"
    assert_run_properties_in_schema_order(root)


# --- UC-A03: the server, not the browser, owns Binding safety -----------------


def upload(client: TestClient, *paragraphs: str) -> dict[str, Any]:
    document = Document()
    for text in paragraphs:
        document.add_paragraph(text)
    stream = BytesIO()
    document.save(stream)
    response = client.post(
        "/api/templates/uploaded-docx",
        content=stream.getvalue(),
        headers={"Content-Type": DOCX_MEDIA_TYPE, "X-Filename": quote("gap.docx")},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def manual_candidate(identifier: str, start: int, end: int, block: str = "body/p:0") -> Any:
    return {
        "id": identifier,
        "label": identifier,
        "type": "short_text",
        "status": "accepted",
        "occurrences": [
            {"block_id": block, "start": start, "end": end, "path": block, "excerpt": ""}
        ],
        "methods": ["manual"],
        "confidence": 1,
    }


def review(client: TestClient, template: dict[str, Any], candidates: list[Any]) -> Any:
    return client.put(
        f"/api/templates/{template['id']}/field-review",
        json={"revision": template["review"]["revision"], "candidates": candidates},
    )


def test_creator_can_add_a_manual_field_when_nothing_is_detected(client: TestClient) -> None:
    template = upload(client, "Người đề nghị: Nguyễn Văn A")
    assert template["review"]["candidates"] == []

    saved = review(client, template, [manual_candidate("nguoi", 15, 27)])

    assert saved.status_code == 200, saved.text
    assert [item["field_key"] for item in saved.json()["fields"]] == ["nguoi"]


@pytest.mark.parametrize(
    ("candidates", "message"),
    [
        ([manual_candidate("a", 0, 5), manual_candidate("b", 3, 8)], "overlap"),
        ([manual_candidate("a", 0, 5), manual_candidate("b", 2, 2)], "overlap"),
        ([manual_candidate("a", 2, 2), manual_candidate("b", 2, 2)], "overlap"),
        ([manual_candidate("a", 0, 500)], "outside"),
        ([manual_candidate("a", 0, 1, block="body/p:99")], "outside"),
    ],
)
def test_field_review_rejects_unsafe_bindings(
    client: TestClient, candidates: list[Any], message: str
) -> None:
    template = upload(client, "Một đoạn văn bản cố định")

    response = review(client, template, candidates)

    assert response.status_code == 422, response.text
    assert message in response.json()["detail"]
    assert client.get(f"/api/templates/{template['id']}").json()["review"]["revision"] == 1


def test_adjacent_bindings_are_allowed(client: TestClient) -> None:
    template = upload(client, "Một đoạn văn bản cố định")

    response = review(client, template, [manual_candidate("a", 0, 3), manual_candidate("b", 3, 8)])

    assert response.status_code == 200, response.text


# --- UC-A05: test mode runs the content check without persisting --------------


def test_test_check_reports_rules_without_creating_a_draft(client: TestClient) -> None:
    template = upload(client, "Một đoạn văn bản cố định")
    candidate = manual_candidate("so_tien", 0, 3)
    candidate.update(type="money", rules={"required": True, "minimum": 100})
    assert review(client, template, [candidate]).status_code == 200
    before = client.get("/api/drafts").json()

    response = client.post(
        f"/api/templates/{template['id']}/test-check", json={"values": {"so_tien": "5"}}
    )

    assert response.status_code == 200, response.text
    assert [item["code"] for item in response.json()["findings"]] == ["rule.so_tien.minimum"]
    assert response.json()["gate"]["final_export_allowed"] is False
    assert client.get("/api/drafts").json() == before


def test_test_check_rejects_unknown_field_keys(client: TestClient) -> None:
    template = upload(client, "Một đoạn văn bản cố định")
    assert review(client, template, [manual_candidate("a", 0, 3)]).status_code == 200

    response = client.post(
        f"/api/templates/{template['id']}/test-check", json={"values": {"zzz": "1"}}
    )

    assert response.status_code == 422


# --- Library and resume (UC-A05 post-condition, UC-A06 step 5) ----------------


def test_library_lists_own_templates_and_drafts_for_resuming(client: TestClient) -> None:
    template = upload(client, "Một đoạn văn bản cố định")
    assert review(client, template, [manual_candidate("a", 0, 3)]).status_code == 200
    assert client.post(f"/api/templates/{template['id']}/publish").status_code == 200
    created = client.post(f"/api/templates/{template['id']}/drafts", json={"title": "Mở lại"})
    assert created.status_code == 201, created.text

    templates = client.get("/api/templates")
    drafts = client.get("/api/drafts")

    assert templates.status_code == 200, templates.text
    assert [(item["id"], item["status"]) for item in templates.json()] == [
        (template["id"], "published")
    ]
    assert drafts.status_code == 200, drafts.text
    assert [(item["title"], item["template_name"]) for item in drafts.json()] == [
        ("Mở lại", "gap.docx")
    ]


# --- UC-A09: bounded renderer and preview/export parity under concurrency -----


def test_concurrent_renders_of_one_version_share_one_pdf_artifact(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    template = upload(client, "Một đoạn văn bản cố định")
    assert review(client, template, [manual_candidate("a", 0, 3)]).status_code == 200
    assert client.post(f"/api/templates/{template['id']}/publish").status_code == 200
    draft = client.post(
        f"/api/templates/{template['id']}/drafts", json={"title": "Đua"}
    ).json()["draft"]
    barrier = threading.Barrier(2, timeout=20)
    counter = iter(range(10))

    def racing_converter(docx: bytes, settings: Settings, still_wanted: object = None) -> bytes:
        number = next(counter)
        barrier.wait()  # both requests have passed the "no snapshot yet" check
        return f"%PDF-render-{number}".encode()

    monkeypatch.setattr(rendering_service, "convert_to_pdf", racing_converter)
    results: dict[str, Any] = {}

    def preview() -> None:
        results["preview"] = client.post(
            f"/api/drafts/{draft['id']}/renders/preview", json={"expected_version": 1}
        )

    def final() -> None:
        results["final"] = client.post(
            f"/api/drafts/{draft['id']}/exports",
            json={"expected_version": 1, "format": "pdf", "purpose": "final_export"},
        )

    threads = [threading.Thread(target=preview), threading.Thread(target=final)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=60)

    assert results["preview"].status_code == 200, results["preview"].text
    assert results["final"].status_code == 200, results["final"].text
    assert results["final"].headers["x-artifact-sha256"] == results["preview"].json()["sha256"]


def test_libreoffice_conversions_are_capped(monkeypatch: pytest.MonkeyPatch) -> None:
    active: list[int] = [0, 0]  # current, peak
    lock = threading.Lock()
    release = threading.Event()

    def slow(docx: bytes, settings: Settings) -> bytes:
        with lock:
            active[0] += 1
            active[1] = max(active)
        release.wait(timeout=0.3)
        with lock:
            active[0] -= 1
        return b"%PDF"

    monkeypatch.setattr(rendering_service, "_run_libreoffice", slow)
    settings = Settings(render_timeout_seconds=30)
    threads = [
        threading.Thread(target=rendering_service.convert_to_pdf, args=(b"x", settings))
        for _ in range(rendering_service.MAX_CONCURRENT_CONVERSIONS + 3)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)

    assert active[1] == rendering_service.MAX_CONCURRENT_CONVERSIONS


@pytest.mark.parametrize(("justified", "tabs"), [(True, 1), (False, 0)])
def test_rich_text_line_breaks_do_not_stretch_justified_lines(justified: bool, tabs: int) -> None:
    """A bare line break in a justified paragraph spreads the words across the page."""
    document = Document()
    item = document.add_paragraph("{{Nội dung}}")
    if justified:
        item.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    stream = BytesIO()
    document.save(stream)
    generation = DocxAnalyzer().analyze(stream.getvalue(), "t.docx")
    candidate = generation.candidates[0].model_copy(
        update={"status": CandidateStatus.ACCEPTED, "type": FieldType.LONG_TEXT}
    )
    generation.candidates = [candidate]

    output = DocxFiller().fill(
        stream.getvalue(),
        generation,
        FillRequest(values={candidate.id: doc_json(paragraph("một"), paragraph("hai"))}),
    )

    root = document_root(output)
    assert len(root.findall(".//w:br", NS)) == 1
    assert len(root.findall(".//w:r/w:tab", NS)) == tabs
    if tabs:
        line_break = root.find(".//w:br", NS)
        assert line_break is not None
        assert line_break.getprevious() is not None
        assert etree.QName(line_break.getprevious()).localname == "tab"


@pytest.mark.parametrize(
    ("field_type", "value", "expected"),
    [
        (FieldType.DATE, "2026-11-05", "05/11/2026"),
        # The legacy fill adapter accepts free text; it must not be reinterpreted.
        (FieldType.DATE, "tháng 11 năm 2026", "tháng 11 năm 2026"),
        (FieldType.DATE, "2026-02-30", "2026-02-30"),
        # Only date Fields are reformatted.
        (FieldType.SHORT_TEXT, "2026-11-05", "2026-11-05"),
    ],
)
def test_date_fields_render_as_vietnamese_day_month_year(
    field_type: FieldType, value: str, expected: str
) -> None:
    document = Document()
    document.add_paragraph("{{Giá trị}}")
    stream = BytesIO()
    document.save(stream)
    generation = DocxAnalyzer().analyze(stream.getvalue(), "t.docx")
    candidate = generation.candidates[0].model_copy(
        update={"status": CandidateStatus.ACCEPTED, "type": field_type}
    )
    generation.candidates = [candidate]

    output = DocxFiller().fill(
        stream.getvalue(), generation, FillRequest(values={candidate.id: value})
    )

    assert Document(BytesIO(output)).paragraphs[0].text == expected


@pytest.mark.parametrize(
    ("header", "sizes"),
    [({"type": "borderless_table", "columns": [0.42, 0.58]}, [12, 13]), ({}, [13, 14])],
)
def test_national_header_uses_smallest_allowed_sizes_inside_the_header_table(
    header: dict[str, Any], sizes: list[int]
) -> None:
    source = build_supported_preset_docx(
        "to_trinh",
        {},
        core={
            "styles": {
                "quoc_hieu": {"size": 13, "size_allowed": [12, 13]},
                "tieu_ngu": {"size": 14, "size_allowed": [13, 14]},
            }
        },
        advanced={"layout": {"header": header}},
    )

    document = Document(BytesIO(source))
    paragraphs = (
        document.tables[0].cell(0, 1).paragraphs if header else document.paragraphs[2:4]
    )
    assert [item.runs[0].font.size for item in paragraphs] == [Pt(size) for size in sizes]


def test_render_queued_behind_a_newer_save_is_dropped_before_converting(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A stale preview must not hold a converter slot for a full conversion."""
    template = upload(client, "Một đoạn văn bản cố định")
    assert review(client, template, [manual_candidate("a", 0, 3)]).status_code == 200
    assert client.post(f"/api/templates/{template['id']}/publish").status_code == 200
    draft = client.post(
        f"/api/templates/{template['id']}/drafts", json={"title": "Cũ"}
    ).json()["draft"]
    converted: list[bytes] = []

    class SlotGrantedAfterNewerSave:
        def acquire(self, timeout: float) -> bool:
            saved = client.put(
                f"/api/drafts/{draft['id']}",
                json={"expected_version": 1, "field_values": {"a": "mới"}},
            )
            assert saved.status_code == 200, saved.text
            return True

        def release(self) -> None:
            pass

    def record(docx: bytes, settings: Settings) -> bytes:
        converted.append(docx)
        return b"%PDF"

    monkeypatch.setattr(rendering_service, "_conversion_slots", SlotGrantedAfterNewerSave())
    monkeypatch.setattr(rendering_service, "_run_libreoffice", record)

    response = client.post(
        f"/api/drafts/{draft['id']}/renders/preview", json={"expected_version": 1}
    )

    assert response.status_code == 409, response.text
    assert converted == []
