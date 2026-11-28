"""Regressions for ISS-008..ISS-011, reduced from real course documents to synthetic text."""

from __future__ import annotations

from xml.sax.saxutils import escape

import pytest

from app.modules.templates.schemas import DetectionMethod, FieldCandidate, FieldType
from app.modules.templates.services.docx_analyzer import DocxAnalyzer
from tests.templates.test_docx_analyzer import docx_with_body


def run(text: str) -> str:
    pieces = [
        f'<w:t xml:space="preserve">{escape(piece)}</w:t>' for piece in text.split("\t")
    ]
    return f"<w:r>{'<w:tab/>'.join(pieces)}</w:r>"


def paragraph(text: str) -> str:
    return f"<w:p>{run(text) if text else ''}</w:p>"


def detect(body: str) -> tuple[list[FieldCandidate], dict[str, str]]:
    result = DocxAnalyzer().analyze(docx_with_body(body), "corpus.docx")
    return result.candidates, {block.id: block.text for block in result.blocks}


def replaced(text: str) -> list[str]:
    """The source text each proposal would overwrite, in document order."""
    candidates, blocks = detect(paragraph(text))
    spans = sorted(
        (o for candidate in candidates for o in candidate.occurrences), key=lambda o: o.start
    )
    return [blocks[o.block_id][o.start : o.end] for o in spans]


# --- ISS-008: a date proposal must never cover fixed words --------------------


def test_date_grouping_keeps_the_words_between_unrelated_blanks() -> None:
    text = (
        "Căn cứ tình hình tại …….Căn cứ quyết định số …../QĐ-… "
        "ngày…..tháng…..năm……. của……….. về việc………"
    )

    covered = replaced(text)

    assert "…..tháng…..năm……." in covered
    for span in covered:
        assert not any(word in span for word in ("Căn", "quyết", "của", "về", "việc"))


@pytest.mark.parametrize(
    ("text", "span"),
    [
        ("Hà Nội, ngày ... tháng ... năm ...", "... tháng ... năm ..."),
        # A single ellipsis character is a complete blank inside a date.
        ("Tp Hồ Chí Minh, ngày … tháng ... năm ....", "… tháng ... năm ...."),
        ("..., ngày ... tháng ... năm 20...", "... tháng ... năm 20..."),
    ],
)
def test_a_split_date_line_is_one_field_that_keeps_ngay(text: str, span: str) -> None:
    covered = replaced(text)

    assert span in covered
    candidates, _ = detect(paragraph(text))
    assert sum(candidate.type is FieldType.DATE for candidate in candidates) == 1


# --- ISS-010: a blank ends at its last placeholder character -------------------


@pytest.mark.parametrize(
    "text",
    ["Công ty: …………… hiện không còn nợ", "Mã số: ..........\tNơi cấp: ______ tại đây"],
)
def test_blanks_do_not_consume_the_following_space(text: str) -> None:
    for span in replaced(text):
        assert span == span.rstrip()


# --- ISS-009: [bracket] placeholders ------------------------------------------


def test_bracket_placeholders_are_replaced_whole_and_stay_proposed() -> None:
    text = "Căn cứ [Tên văn bản pháp luật] của [Tên cơ quan...] ban hành"

    candidates, _ = detect(paragraph(text))

    assert replaced(text) == ["[Tên văn bản pháp luật]", "[Tên cơ quan...]"]
    assert [candidate.label for candidate in candidates] == [
        "Tên văn bản pháp luật",
        "Tên cơ quan",
    ]
    assert all(candidate.methods == [DetectionMethod.BRACKET] for candidate in candidates)
    assert all(candidate.status.value == "proposed" for candidate in candidates)


def test_nested_brackets_become_one_outer_field_with_the_hint_as_instruction() -> None:
    text = "[Tên quy chế – ví dụ: Quy chế làm việc của [Tên cơ quan]]"

    [candidate] = detect(paragraph(text))[0]

    assert replaced(text) == [text]
    assert candidate.label == "Tên quy chế"
    assert "ví dụ" in candidate.instructions[0].text


def test_repeated_bracket_text_stays_separate_with_distinct_labels() -> None:
    body = paragraph("[Chi tiết nội dung...]") + paragraph("[Chi tiết nội dung...]")

    candidates, _ = detect(body)

    assert [candidate.label for candidate in candidates] == [
        "Chi tiết nội dung",
        "Chi tiết nội dung (2)",
    ]
    assert all(candidate.type is FieldType.LONG_TEXT for candidate in candidates)


@pytest.mark.parametrize("text", ["Xem tài liệu [1] và [23].", "Ngoặc không đóng [abc"])
def test_citations_and_unbalanced_brackets_are_not_fields(text: str) -> None:
    assert detect(paragraph(text))[0] == []


def test_an_empty_bracket_blank_takes_a_generic_label() -> None:
    [candidate] = detect(paragraph("- […]"))[0]

    assert candidate.label == "Nội dung"
    assert replaced("- […]") == ["[…]"]


# --- ISS-011: duplicates, stray cells, and "sinh viên" -------------------------


def test_dots_followed_by_a_tab_are_proposed_once() -> None:
    text = "\t1. Họ và tên (viết in hoa): …………………………\t"

    assert replaced(text) == ["…………………………"]


def test_a_tab_before_prefilled_text_is_not_a_blank() -> None:
    assert replaced("Kính gửi: \tBan Thư ký Hội Sinh viên") == []


def test_a_trailing_tab_after_a_label_is_still_a_blank() -> None:
    assert replaced("\tHọ tên phụ huynh: \t") == ["\t"]


def cell(*texts: str) -> str:
    return f"<w:tc>{''.join(paragraph(text) for text in texts)}</w:tc>"


def table(*cells: str) -> str:
    return f"<w:tbl><w:tr>{''.join(cells)}</w:tr></w:tbl>"


def test_spacing_paragraphs_in_a_filled_cell_are_not_fields() -> None:
    body = table(cell("Nơi nhận:"), cell("", "TM. CƠ QUAN", "", ""))

    assert detect(body)[0] == []


def test_a_fully_empty_cell_next_to_a_label_is_one_field() -> None:
    candidates, _ = detect(table(cell("Họ và tên"), cell("", "")))

    assert [candidate.label for candidate in candidates] == ["Họ và tên"]


@pytest.mark.parametrize(
    ("label", "expected"),
    [
        ("Hiện là sinh viên lớp", FieldType.SHORT_TEXT),
        ("Ngày sinh", FieldType.DATE),
        ("Sinh ngày", FieldType.DATE),
        ("Năm sinh", FieldType.DATE),
    ],
)
def test_only_date_words_make_a_label_a_date(label: str, expected: FieldType) -> None:
    [candidate] = detect(paragraph(f"{label}: ……………"))[0]

    assert candidate.type is expected


# --- Found while comparing proposals before and after on the real corpus ------


def test_ellipsis_blanks_before_a_numbered_label_are_not_reference_dots() -> None:
    text = "\t4. Dân tộc: …………...\t 5. Tôn giáo: ………………. \t6. Quốc tịch: …..……\t"

    assert replaced(text) == ["…………...", "……………….", "…..……"]


def test_dots_ending_in_a_single_period_before_a_tab_are_proposed_once() -> None:
    assert len(replaced("7. Địa chỉ thường trú: ……………………….\t")) == 1


@pytest.mark.parametrize(
    ("text", "label"),
    [
        ("…..,ngày…..tháng....năm…….", "Ngày, tháng, năm"),
        ("5..., ngày... tháng... năm...", "Ngày, tháng, năm"),
        ("Tại …….Căn cứ quyết định số …../QĐ-… ngày…..tháng…..năm…….", "Ngày, tháng, năm"),
        ("Tp Hồ Chí Minh, ngày … tháng ... năm ....", "Tp Hồ Chí Minh, ngày"),
        ("- Căn cứ [Tên văn bản] ngày... tháng... năm...", "Ngày, tháng, năm"),
    ],
)
def test_date_labels_are_readable(text: str, label: str) -> None:
    candidates, _ = detect(paragraph(text))

    assert [c.label for c in candidates if c.type is FieldType.DATE] == [label]


def test_a_rule_of_box_drawing_characters_is_not_a_label() -> None:
    candidates, _ = detect(paragraph("──────────...\t"))

    assert candidates == []
