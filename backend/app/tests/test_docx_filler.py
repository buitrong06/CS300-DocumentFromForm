from io import BytesIO
from zipfile import ZipFile

from app.models import CandidateStatus, FillRequest
from app.services.docx_analyzer import DocxAnalyzer
from app.services.docx_filler import DocxFiller
from app.tests.test_docx_analyzer import docx_with_body


def word_document_text(payload: bytes) -> str:
    with ZipFile(BytesIO(payload)) as archive:
        return archive.read("word/document.xml").decode("utf-8")


def test_fills_marker_that_spans_two_word_runs() -> None:
    source = docx_with_body("<w:p><w:r><w:t>Người ký: {{Họ</w:t></w:r><w:r><w:t> và tên}}</w:t></w:r><w:r><w:t>. Giữ nguyên câu này.</w:t></w:r></w:p>")
    generation = DocxAnalyzer().analyze(source, "template.docx")
    field = generation.candidates[0].model_copy(update={"status": CandidateStatus.ACCEPTED})
    generation.candidates = [field]
    output = DocxFiller().fill(source, generation, FillRequest(values={field.id: "Nguyễn An"}))
    xml = word_document_text(output)
    assert "Nguyễn An" in xml
    assert "{{Họ" not in xml
    assert "Giữ nguyên câu này." in xml


def test_fills_repeated_marker_everywhere() -> None:
    source = docx_with_body("<w:p><w:r><w:t>{{Tên đơn vị}} gửi {{Tên đơn vị}}</w:t></w:r></w:p>")
    generation = DocxAnalyzer().analyze(source, "template.docx")
    field = generation.candidates[0].model_copy(update={"status": CandidateStatus.ACCEPTED})
    generation.candidates = [field]
    output = DocxFiller().fill(source, generation, FillRequest(values={field.id: "Đoàn Khoa CNTT"}))
    assert word_document_text(output).count("Đoàn Khoa CNTT") == 2


def test_fills_wingdings_checkbox_as_a_checked_box() -> None:
    source = docx_with_body(
        '<w:p><w:r><w:t>Viettel </w:t><w:sym w:font="Wingdings 2" w:char="F0A3"/></w:r></w:p>'
    )
    generation = DocxAnalyzer().analyze(source, "template.docx")
    field = next(candidate for candidate in generation.candidates if candidate.methods[0].value == "checkbox")
    generation.candidates = [field.model_copy(update={"status": CandidateStatus.ACCEPTED})]
    output = DocxFiller().fill(source, generation, FillRequest(values={field.id: "checked"}))
    xml = word_document_text(output)
    assert "☒" in xml
    assert "w:sym" not in xml
