from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from app.modules.templates.schemas import DetectionMethod, FieldType
from app.modules.templates.services.docx_analyzer import DocxAnalyzer


def docx_with_body(body: str) -> bytes:
    content_types = """<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>"""  # noqa: E501
    document = f"""<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{body}<w:sectPr/></w:body></w:document>"""
    stream = BytesIO()
    with ZipFile(stream, "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("word/document.xml", document)
    return stream.getvalue()


def test_detects_marker_split_across_runs() -> None:
    body = "<w:p><w:r><w:t>Ngày ban hành: {{ng</w:t></w:r><w:r><w:t>ày ký}}</w:t></w:r></w:p>"
    result = DocxAnalyzer().analyze(docx_with_body(body), "date.docx")
    assert len(result.candidates) == 1
    assert result.candidates[0].label == "ngày ký"
    assert result.candidates[0].type is FieldType.DATE
    assert result.candidates[0].methods == [DetectionMethod.MARKER]


def test_detects_labeled_underscore_blank() -> None:
    body = "<w:p><w:r><w:t>Số tiền: _________</w:t></w:r></w:p>"
    result = DocxAnalyzer().analyze(docx_with_body(body), "money.docx")
    assert len(result.candidates) == 1
    assert result.candidates[0].label == "Số tiền"
    assert result.candidates[0].type is FieldType.MONEY


def test_detects_checkbox_and_labeled_number_field() -> None:
    body = (
        "<w:p><w:r><w:t>Giới tính: Nam □ Nữ □</w:t></w:r></w:p>"
        "<w:p><w:r><w:t>Số định danh cá nhân: ________</w:t></w:r></w:p>"
    )
    result = DocxAnalyzer().analyze(docx_with_body(body), "checkbox-number.docx")
    checkboxes = [field for field in result.candidates if DetectionMethod.CHECKBOX in field.methods]
    numbers = [field for field in result.candidates if field.type is FieldType.NUMBER]
    assert len(checkboxes) == 2
    assert all(field.label == "Giới tính" for field in checkboxes)
    assert len(numbers) == 1
    assert numbers[0].label == "Số định danh cá nhân"


def test_attaches_word_comment_to_marker_instruction() -> None:
    body = """<w:p><w:commentRangeStart w:id="1"/><w:r><w:t>{{Nội dung}}</w:t></w:r><w:commentRangeEnd w:id="1"/></w:p>"""  # noqa: E501
    payload = docx_with_body(body)
    stream = BytesIO(payload)
    with ZipFile(stream, "a", ZIP_DEFLATED) as archive:
        archive.writestr(
            "word/comments.xml",
            """<?xml version="1.0"?><w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment w:id="1"><w:p><w:r><w:t>Nêu rõ mục tiêu và kết quả.</w:t></w:r></w:p></w:comment></w:comments>""",  # noqa: E501
        )
    result = DocxAnalyzer().analyze(stream.getvalue(), "comment.docx")
    assert result.candidates[0].instructions[0].text == "Nêu rõ mục tiêu và kết quả."
