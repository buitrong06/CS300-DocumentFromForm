from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from app.models import CandidateStatus, DetectionMethod, FillRequest
from app.services.docx_analyzer import DocxAnalyzer
from app.services.docx_filler import DocxFiller


SOURCE_FILENAMES = (
    "1604372463_Mau_CC01.docx",
    "1698204115_CT01.docx",
    "Ban_khai_dang_ky_ten_dinh_danh_1740715404.docx",
    "mau-to-trinh-chung_1408184733.docx",
)


def test_existing_source_documents_are_valid_docx_with_fields() -> None:
    samples_directory = Path(__file__).resolve().parents[3] / "frontend" / "public" / "samples"
    analyzer = DocxAnalyzer()
    for filename in SOURCE_FILENAMES:
        result = analyzer.analyze((samples_directory / filename).read_bytes(), filename)
        assert result.candidates, filename
    identifier_filename = "Ban_khai_dang_ky_ten_dinh_danh_1740715404.docx"
    identifier_form = analyzer.analyze((samples_directory / identifier_filename).read_bytes(), identifier_filename)
    assert "BẢN KHAI" not in {candidate.label for candidate in identifier_form.candidates}
    assert any(candidate.label.startswith("6.1. Tên Cá nhân") for candidate in identifier_form.candidates)
    assert any(candidate.label.startswith("7.1. Họ và tên") for candidate in identifier_form.candidates)


def test_existing_source_documents_can_be_extracted_and_filled() -> None:
    """Exercise the exact extract → review → fill path for supplied DOCX files."""
    samples_directory = Path(__file__).resolve().parents[3] / "frontend" / "public" / "samples"
    analyzer = DocxAnalyzer()
    filler = DocxFiller()
    for filename in SOURCE_FILENAMES:
        source = (samples_directory / filename).read_bytes()
        generation = analyzer.analyze(source, filename)
        accepted = [candidate.model_copy(update={"status": CandidateStatus.ACCEPTED}) for candidate in generation.candidates]
        reviewed = generation.model_copy(update={"candidates": accepted})
        values = {candidate.id: f"Giá trị kiểm thử {index}" for index, candidate in enumerate(accepted, start=1)}
        filled = filler.fill(source, reviewed, FillRequest(values=values))

        with ZipFile(BytesIO(filled)) as archive:
            document_xml = archive.read("word/document.xml").decode("utf-8")
        expected = ["☐" if DetectionMethod.CHECKBOX in candidate.methods else values[candidate.id] for candidate in accepted]
        assert all(value in document_xml for value in expected), filename
