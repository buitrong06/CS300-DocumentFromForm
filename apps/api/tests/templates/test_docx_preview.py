from app.modules.templates.services.docx_analyzer import DocxAnalyzer
from app.modules.templates.services.docx_preview import DocxPreviewRenderer
from tests.templates.test_docx_analyzer import docx_with_body


def test_preview_keeps_word_alignment_and_renders_detected_regions_as_fields() -> None:
    source = docx_with_body(
        '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
        "<w:r><w:rPr><w:b/></w:rPr><w:t>THÔNG BÁO</w:t></w:r></w:p>"
        "<w:p><w:r><w:t>Họ tên: {{Họ tên}}</w:t></w:r></w:p>"
    )
    generation = DocxAnalyzer().analyze(source, "mau.docx")
    html = DocxPreviewRenderer().render(source, generation)
    assert "text-align:center" in html
    assert "<strong>THÔNG BÁO</strong>" in html
    assert 'class="docx-form-field"' in html
    assert 'aria-label="Họ tên"' in html


def test_preview_ignores_a_malicious_word_color_attribute() -> None:
    source = docx_with_body(
        '<w:p><w:r><w:rPr><w:color w:val="000000&quot; onmouseover=&quot;alert(1)"/>'
        "</w:rPr><w:t>Nội dung an toàn</w:t></w:r></w:p>"
    )
    generation = DocxAnalyzer().analyze(source, "malicious-color.docx")

    html = DocxPreviewRenderer().render(source, generation)

    assert "onmouseover" not in html
    assert "alert(1)" not in html


def test_consecutive_unlabeled_dotted_lines_render_as_one_large_field() -> None:
    source = docx_with_body(
        "<w:p><w:r><w:t>Nội dung trình bày:</w:t></w:r></w:p>"
        "<w:p><w:r><w:t>………………………………</w:t></w:r></w:p>"
        "<w:p><w:r><w:t>………………………………</w:t></w:r></w:p>"
        "<w:p><w:r><w:t>………………………………</w:t></w:r></w:p>"
    )
    generation = DocxAnalyzer().analyze(source, "mau.docx")
    html = DocxPreviewRenderer().render(source, generation)
    assert html.count("<textarea") == 1
    assert "height:114px" in html
    assert "docx-form-field-number-cells" not in html
    assert "……………………" not in html


def test_cccd_vml_entry_cells_become_one_fillable_digit_field() -> None:
    from pathlib import Path

    sample = Path(__file__).parents[3] / "web/public/samples/1604372463_Mau_CC01.docx"
    source = sample.read_bytes()
    generation = DocxAnalyzer().analyze(source, sample.name)
    field = next(
        candidate
        for candidate in generation.candidates
        if candidate.label.startswith("5. Số CMND/CCCD")
    )
    assert field.type.value == "number"
    assert field.occurrences[0].start == field.occurrences[0].end

    html = DocxPreviewRenderer().render(source, generation)
    assert 'class="docx-form-field docx-form-field-number-cells"' in html
    assert 'inputmode="numeric" maxlength="12"' in html
    assert (
        'style="position:absolute;z-index:3;left:171pt;top:-0.2pt;width:288pt;height:17.25pt;--slot-width:24pt"'
        in html
    )


def test_ct01_finds_id_grids_member_rows_and_signatory_areas() -> None:
    from pathlib import Path

    sample = Path(__file__).parents[3] / "web/public/samples/1698204115_CT01.docx"
    source = sample.read_bytes()
    generation = DocxAnalyzer().analyze(source, sample.name)
    assert (
        len([field for field in generation.candidates if field.label.startswith("Thành viên ")])
        == 42
    )
    assert (
        next(field for field in generation.candidates if field.label == "3. Giới tính").type.value
        == "choice"
    )
    identity_fields = [
        field
        for field in generation.candidates
        if field.label.startswith(("4. Số định danh", "13. Số định danh"))
    ]
    assert len(identity_fields) == 2
    assert all(field.rules.max_length == 12 for field in identity_fields)
    assert (
        len(
            [
                field
                for field in generation.candidates
                if "ý kiến" in field.label.casefold() or "chữ ký" in field.label.casefold()
            ]
        )
        == 4
    )
    assert any(
        field.label.startswith("5. Số điện thoại")
        and field.occurrences[0].end > field.occurrences[0].start + 1
        for field in generation.candidates
    )

    html = DocxPreviewRenderer().render(source, generation)
    assert html.count('class="docx-number-grid-group"') == 2
    assert html.count("<textarea") == 4
    assert "…………" not in html


def test_identifier_application_resolves_reference_blanks_and_wingdings_checkboxes() -> None:
    from pathlib import Path

    sample = (
        Path(__file__).parents[3]
        / "web/public/samples/Ban_khai_dang_ky_ten_dinh_danh_1740715404.docx"
    )
    source = sample.read_bytes()
    generation = DocxAnalyzer().analyze(source, sample.name)
    action = next(field for field in generation.candidates if field.label == "Hình thức đề nghị")
    applicant = next(
        field
        for field in generation.candidates
        if field.label == "Tên cá nhân, tổ chức/doanh nghiệp"
    )
    assert action.type.value == "choice"
    assert [option.label for option in action.options] == ["Cấp", "Cấp lại", "Gia hạn"]
    assert len(action.occurrences) == 4
    assert len(applicant.occurrences) == 3

    name_boxes = next(
        field for field in generation.candidates if field.label == "1. Tên định danh đăng ký"
    )
    assert name_boxes.methods[0].value == "boxed_field"
    assert name_boxes.rules.max_length == 11
    network_options = [
        field
        for field in generation.candidates
        if "Dự kiến sử dụng tên định danh trên các mạng —" in field.label
    ]
    assert len(network_options) == 6
    assert {field.label.rsplit("— ", 1)[-1] for field in network_options} == {
        "Viettel",
        "MobiFone",
        "Vinaphone",
        "Vietnamobile",
        "Gtel",
        "Mạng khác",
    }

    html = DocxPreviewRenderer().render(source, generation)
    assert html.count('type="checkbox"') == 6
    assert 'class="docx-form-field docx-form-field-character-cells"' in html
    assert "BẢN KHAI …" not in html
    assert "…… (2) đề nghị" not in html
