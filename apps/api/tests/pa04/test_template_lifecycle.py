from io import BytesIO
from typing import Any, cast
from urllib.parse import quote
from zipfile import ZipFile

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Mm, Pt
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.models import DocumentDraft, DocumentTemplate, FormattingPreset, TemplateField, User
from app.modules.templates.lifecycle import build_supported_preset_docx
from app.modules.templates.schemas import CandidateStatus
from app.modules.templates.store import DOCX_MEDIA_TYPE
from tests.templates.test_docx_analyzer import docx_with_body


def upload_template(client: TestClient) -> dict[str, Any]:
    source = docx_with_body("<w:p><w:r><w:t>Ngày ký: {{ngày ký}}</w:t></w:r></w:p>")
    response = client.post(
        "/api/templates/uploaded-docx",
        content=source,
        headers={"Content-Type": DOCX_MEDIA_TYPE, "X-Filename": quote("mẫu PA04.docx")},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


def accepted_review(review: dict[str, Any]) -> dict[str, Any]:
    candidate = dict(cast(list[dict[str, Any]], review["candidates"])[0])
    candidate["status"] = CandidateStatus.ACCEPTED
    return {"revision": review["revision"], "candidates": [candidate]}


def test_preset_generator_applies_selected_core_and_role_styles() -> None:
    source = build_supported_preset_docx(
        "to_trinh",
        {
            "governing_org": "Cơ quan chủ quản",
            "issuing_org": "Cơ quan ban hành",
            "signer_title": "Hiệu trưởng",
        },
        core={
            "page": {
                "size": "A4",
                "orientation": "portrait",
                "margin": {"top": 18, "bottom": 19, "left": 25, "right": 16},
            },
            "font": {"family": "Arial", "color": "112233"},
            "styles": {
                "co_quan_chu_quan": {"size": 11, "case": "upper", "align": "center"},
                "co_quan_ban_hanh": {"size": 12, "bold": True, "align": "center"},
                "ten_loai": {"size": 15, "case": "upper", "bold": True, "align": "center"},
                "trich_yeu": {"size": 14, "align": "center"},
                "kinh_gui": {"size": 13},
                "body": {"size": 12, "align": "justify", "first_line_indent": 10},
                "chuc_vu": {"size": 13, "case": "upper", "bold": True, "align": "center"},
            },
        },
        advanced={
            "styles": {"ten_loai": {"italic": True}},
            "layout": {
                "header": {"type": "borderless_table", "columns": [0.4, 0.6]},
                "footer": {"type": "borderless_table", "columns": [0.45, 0.55]},
            },
            "decorations": {"ten_loai": {"rule_below": {"length": 0.4}}},
        },
    )

    document = Document(BytesIO(source))
    section = document.sections[0]
    assert section.top_margin is not None
    assert section.bottom_margin is not None
    assert section.left_margin is not None
    assert section.right_margin is not None
    assert section.top_margin.twips == Mm(18).twips
    assert section.bottom_margin.twips == Mm(19).twips
    assert section.left_margin.twips == Mm(25).twips
    assert section.right_margin.twips == Mm(16).twips
    assert len(document.tables) == 2
    assert document.tables[0].cell(0, 0).paragraphs[0].text == "CƠ QUAN CHỦ QUẢN"
    assert document.tables[0].cell(0, 0).paragraphs[0].alignment is WD_ALIGN_PARAGRAPH.CENTER
    assert document.tables[0].cell(0, 0).paragraphs[0].runs[0].font.name == "Arial"
    assert document.tables[0].cell(0, 1).paragraphs[0].text == "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
    assert document.tables[1].cell(0, 1).paragraphs[0].text == "HIỆU TRƯỞNG"
    assert document.paragraphs[0].alignment is WD_ALIGN_PARAGRAPH.CENTER
    assert document.paragraphs[0].runs[0].font.size == Pt(15)
    assert document.paragraphs[0].runs[0].font.bold is True
    assert document.paragraphs[0].runs[0].font.italic is True
    assert document.paragraphs[0]._p.pPr is not None
    borders = document.paragraphs[0]._p.pPr.find(qn("w:pBdr"))
    assert borders is not None
    assert borders.find(qn("w:bottom")) is not None


def test_preset_template_uses_typed_review_defaults_for_known_slots(
    client: TestClient,
    owner: User,
    postgres_sessions: sessionmaker[Session],
) -> None:
    with postgres_sessions.begin() as db:
        preset = FormattingPreset(
            slug="typed-to-trinh-pa04",
            version=1,
            name="Typed Tờ trình",
            is_builtin=False,
            status="published",
            document_types={"van_ban_co_ten_loai": {"variants": {"to_trinh": {}}}},
            created_by=owner.id,
        )
        db.add(preset)
        db.flush()
        preset_id = preset.id

    response = client.post(
        "/api/templates/from-preset",
        json={
            "preset_id": preset_id,
            "document_type_key": "to_trinh",
            "name": "Tờ trình có Field chuẩn",
            "org_constants": {},
        },
    )

    assert response.status_code == 201, response.text
    review_candidates = response.json()["review"]["candidates"]
    candidates = {candidate["id"]: candidate for candidate in review_candidates}
    assert candidates["trich_yeu"]["label"] == "Trích yếu"
    assert candidates["trich_yeu"]["type"] == "short_text"
    assert candidates["trich_yeu"]["rules"]["required"] is True
    assert candidates["noi_dung_de_xuat"]["label"] == "Nội dung đề xuất"
    assert candidates["noi_dung_de_xuat"]["type"] == "long_text"
    assert candidates["noi_dung_de_xuat"]["rules"]["required"] is True
    assert candidates["kinh_phi_du_kien"]["type"] == "money"
    assert candidates["kinh_phi_du_kien"]["rules"]["required"] is False


def test_uploaded_template_can_be_reviewed_test_filled_and_published(
    client: TestClient, postgres_sessions: sessionmaker[Session]
) -> None:
    created = upload_template(client)
    template_id = created["id"]
    review = created["review"]
    assert created["status"] == "draft"
    assert review["filename"] == "mẫu PA04.docx"

    saved = client.put(
        f"/api/templates/{template_id}/field-review",
        json=accepted_review(review),
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["review"]["status"] == "ready"

    with postgres_sessions() as db:
        fields = db.scalars(
            select(TemplateField).where(TemplateField.template_id == template_id)
        ).all()
        assert len(fields) == 1
        assert fields[0].field_key == review["candidates"][0]["id"]

    with postgres_sessions() as db:
        drafts_before_test_fill = db.scalar(select(func.count()).select_from(DocumentDraft))

    test_fill = client.post(
        f"/api/templates/{template_id}/test-fill",
        json={"values": {review["candidates"][0]["id"]: "15/11/2026"}},
    )
    assert test_fill.status_code == 200, test_fill.text
    with ZipFile(BytesIO(test_fill.content)) as archive:
        assert "15/11/2026" in archive.read("word/document.xml").decode("utf-8")

    with postgres_sessions() as db:
        assert db.scalar(select(func.count()).select_from(DocumentDraft)) == drafts_before_test_fill

    published = client.post(f"/api/templates/{template_id}/publish")
    assert published.status_code == 200, published.text
    assert published.json()["status"] == "published"
    assert published.json()["fields"][0]["field_key"] == review["candidates"][0]["id"]

    with postgres_sessions() as db:
        template = db.get(DocumentTemplate, template_id)
        assert template is not None
        assert template.status == "published"
        assert template.published_at is not None

    assert client.put(
        f"/api/templates/{template_id}/field-review",
        json=accepted_review(saved.json()["review"]),
    ).status_code == 409


def test_publish_rejects_unreviewed_template(client: TestClient) -> None:
    created = upload_template(client)

    response = client.post(f"/api/templates/{created['id']}/publish")

    assert response.status_code == 422
    assert "review" in response.json()["detail"].casefold()


def test_available_presets_only_include_built_in_or_owner_presets(
    client: TestClient,
    owner: User,
    postgres_sessions: sessionmaker[Session],
) -> None:
    with postgres_sessions.begin() as db:
        db.add_all(
            [
                FormattingPreset(
                    slug="built-in-pa04",
                    version=1,
                    name="Built-in PA04",
                    is_builtin=True,
                    status="published",
                    document_types={
                        "van_ban_co_ten_loai": {"variants": {"to_trinh": {}}}
                    },
                    created_by=owner.id,
                ),
                FormattingPreset(
                    slug="owner-pa04",
                    version=1,
                    name="Owner PA04",
                    is_builtin=False,
                    status="published",
                    document_types={"to_trinh": {}},
                    created_by=owner.id,
                ),
            ]
        )

    response = client.get("/api/presets")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert [preset["slug"] for preset in payload] == ["built-in-pa04", "owner-pa04"]
    assert payload[0]["document_type_keys"] == ["to_trinh"]


def test_preset_creation_rejects_a_document_type_missing_from_that_preset(
    client: TestClient,
    owner: User,
    postgres_sessions: sessionmaker[Session],
) -> None:
    with postgres_sessions.begin() as db:
        preset = FormattingPreset(
            slug="cong-van-only-pa04",
            version=1,
            name="Công văn only",
            is_builtin=False,
            status="published",
            document_types={"cong_van": {}},
            created_by=owner.id,
        )
        db.add(preset)
        db.flush()
        preset_id = preset.id

    response = client.post(
        "/api/templates/from-preset",
        json={
            "preset_id": preset_id,
            "document_type_key": "to_trinh",
            "name": "Không được tạo",
            "org_constants": {},
        },
    )

    assert response.status_code == 422
    assert "does not support" in response.json()["detail"]
