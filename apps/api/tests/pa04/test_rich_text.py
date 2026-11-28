import json

import pytest

from app.core.models import TemplateField
from app.modules.drafts.rich_text import RichTextError, rich_text_to_word_runs, validate_rich_text
from app.modules.validation.service import validate_field


def test_validates_tiptap_json_and_converts_bold_italic_and_bullets() -> None:
    payload = json.dumps(
        {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Kết quả ", "marks": [{"type": "bold"}]},
                        {"type": "text", "text": "đã kiểm tra", "marks": [{"type": "italic"}]},
                    ],
                },
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": "Mục một"}],
                                }
                            ],
                        }
                    ],
                },
            ],
        },
        ensure_ascii=False,
    )

    document = validate_rich_text(payload)
    runs = rich_text_to_word_runs(document)

    assert [(run.text, run.bold, run.italic) for run in runs] == [
        ("Kết quả ", True, False),
        ("đã kiểm tra", False, True),
        ("\n• Mục một", False, False),
    ]


def test_rejects_html_and_unsupported_tiptap_nodes() -> None:
    with pytest.raises(RichTextError, match="HTML"):
        validate_rich_text("<strong>not allowed</strong>")

    with pytest.raises(RichTextError, match="Unsupported"):
        validate_rich_text(json.dumps({"type": "doc", "content": [{"type": "image"}]}))


def test_empty_tiptap_document_does_not_satisfy_a_required_long_text_field() -> None:
    field = TemplateField(
        template_id=1,
        field_key="noi_dung_de_xuat",
        label="Nội dung đề xuất",
        field_type="long_text",
        is_required=True,
    )
    empty_document = json.dumps(
        {"type": "doc", "content": [{"type": "paragraph"}]}, ensure_ascii=False
    )

    findings = validate_field(field, empty_document)

    assert [finding.code for finding in findings] == ["required.noi_dung_de_xuat"]
