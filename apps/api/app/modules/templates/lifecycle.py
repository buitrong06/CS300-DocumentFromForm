from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Literal, cast
from uuid import uuid4

from docx import Document
from docx.document import Document as WordDocument
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Emu, Mm, Pt, RGBColor
from docx.text.paragraph import Paragraph
from docx.text.run import Run
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts.templates import TemplateFieldType, TemplateSourceType
from app.contracts.validation import GateDecision, ValidationFinding
from app.core.models import DocumentTemplate, FileArtifact, FormattingPreset, TemplateField, User
from app.modules.templates.bindings import BindingError, validate_accepted_bindings
from app.modules.templates.schemas import (
    CandidateStatus,
    DetectionMethod,
    FieldCandidate,
    FieldRules,
    FieldType,
    FormGeneration,
    GenerationPatch,
    Instruction,
    SourceLocation,
)
from app.modules.templates.services.docx_analyzer import DocxAnalyzer
from app.modules.templates.store import FormGenerationStore, RevisionConflict


class TemplateFieldView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    field_key: str
    label: str
    field_type: str
    is_required: bool
    instructions: str | None
    display_order: int
    bindings: list[dict[str, Any]]
    choice_options: list[dict[str, Any]]
    automatic_rules: list[dict[str, Any]]
    semantic_criteria: list[dict[str, Any]]


class TemplateDraftView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    slug: str
    name: str
    version: int
    status: Literal["draft", "published", "archived"]
    source_type: str
    preset_id: int | None
    document_type_key: str | None
    source_artifact_id: int | None
    org_constants: dict[str, Any]
    published_at: datetime | None
    review: FormGeneration | None
    fields: list[TemplateFieldView]


class TemplateSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    name: str
    version: int
    status: Literal["draft", "published", "archived"]
    source_type: str
    created_at: datetime
    published_at: datetime | None


class ContentCheckView(BaseModel):
    """UC-A05 test-mode result; sample values are never persisted."""

    model_config = ConfigDict(extra="forbid")

    checked_field_keys: list[str]
    findings: list[ValidationFinding]
    gate: GateDecision


def list_templates(db: Session, owner_id: int) -> list[TemplateSummary]:
    templates = db.scalars(
        select(DocumentTemplate)
        .where(DocumentTemplate.owner_id == owner_id)
        .order_by(DocumentTemplate.created_at.desc(), DocumentTemplate.id.desc())
    )
    return [
        TemplateSummary(
            id=template.id,
            name=template.name,
            version=template.version,
            status=cast(Literal["draft", "published", "archived"], template.status),
            source_type=template.source_type,
            created_at=template.created_at,
            published_at=template.published_at,
        )
        for template in templates
    ]


class CreatePresetTemplateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preset_id: int = Field(gt=0)
    document_type_key: str = Field(min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    org_constants: dict[str, str] = Field(default_factory=dict)


class TemplatePublishError(ValueError):
    pass


def active_owner_id(db: Session, firebase_uid: str) -> int | None:
    return db.scalar(select(User.id).where(User.firebase_uid == firebase_uid, User.is_active))


def owned_template(
    db: Session, owner_id: int, template_id: int, *, for_update: bool = False
) -> tuple[DocumentTemplate, FileArtifact] | None:
    query = (
        select(DocumentTemplate, FileArtifact)
        .join(FileArtifact, DocumentTemplate.source_artifact_id == FileArtifact.id)
        .where(DocumentTemplate.id == template_id, DocumentTemplate.owner_id == owner_id)
    )
    if for_update:
        query = query.with_for_update(of=DocumentTemplate)
    return db.execute(query).one_or_none()


def fields_for_template(db: Session, template_id: int) -> list[TemplateField]:
    return list(
        db.scalars(
            select(TemplateField)
            .where(TemplateField.template_id == template_id)
            .order_by(TemplateField.display_order, TemplateField.id)
        )
    )


def template_field_view(field: TemplateField) -> TemplateFieldView:
    return TemplateFieldView(
        id=field.id,
        field_key=field.field_key,
        label=field.label,
        field_type=field.field_type,
        is_required=field.is_required,
        instructions=field.instructions,
        display_order=field.display_order,
        bindings=list(field.bindings),
        choice_options=list(field.choice_options),
        automatic_rules=list(field.automatic_rules),
        semantic_criteria=list(field.semantic_criteria),
    )


def generation_from_template(
    template: DocumentTemplate, artifact: FileArtifact
) -> FormGeneration | None:
    if template.extraction_state is None:
        return None
    return FormGeneration.model_validate(
        {
            **template.extraction_state,
            "id": template.slug,
            "filename": artifact.original_filename,
            "sha256": artifact.sha256,
            "created_at": template.created_at,
        }
    )


def template_view(
    db: Session, template: DocumentTemplate, artifact: FileArtifact
) -> TemplateDraftView:
    return TemplateDraftView(
        id=template.id,
        slug=template.slug,
        name=template.name,
        version=template.version,
        status=cast(Literal["draft", "published", "archived"], template.status),
        source_type=template.source_type,
        preset_id=template.preset_id,
        document_type_key=template.document_type_key,
        source_artifact_id=template.source_artifact_id,
        org_constants=dict(template.org_constants),
        published_at=template.published_at,
        review=generation_from_template(template, artifact),
        fields=[template_field_view(field) for field in fields_for_template(db, template.id)],
    )


def load_source(storage_dir: Path, artifact: FileArtifact) -> bytes:
    try:
        return (storage_dir / artifact.storage_key).read_bytes()
    except FileNotFoundError as exc:
        raise TemplatePublishError("The original template DOCX is unavailable") from exc


def create_uploaded_template(
    db: Session,
    owner_id: int,
    storage_dir: Path,
    source: bytes,
    filename: str,
) -> TemplateDraftView:
    generation = DocxAnalyzer().analyze(source, filename)
    store = FormGenerationStore(db, owner_id, storage_dir)
    store.create(generation, source)
    with db.begin():
        row = owned_template_by_slug(db, owner_id, generation.id)
        if row is None:
            raise RuntimeError("The uploaded template was not persisted")
        template, artifact = row
        return template_view(db, template, artifact)


def owned_template_by_slug(
    db: Session, owner_id: int, slug: str, *, for_update: bool = False
) -> tuple[DocumentTemplate, FileArtifact] | None:
    query = (
        select(DocumentTemplate, FileArtifact)
        .join(FileArtifact, DocumentTemplate.source_artifact_id == FileArtifact.id)
        .where(
            DocumentTemplate.owner_id == owner_id,
            DocumentTemplate.slug == slug,
            DocumentTemplate.version == 1,
        )
    )
    if for_update:
        query = query.with_for_update(of=DocumentTemplate)
    return db.execute(query).one_or_none()


def save_field_review(
    db: Session,
    owner_id: int,
    storage_dir: Path,
    template_id: int,
    patch: GenerationPatch,
) -> TemplateDraftView | None:
    with db.begin():
        row = owned_template(db, owner_id, template_id)
        if row is None:
            return None
        template, _ = row
        if template.status != "draft":
            raise TemplatePublishError("Published Templates cannot be reconfigured in place")
        slug = template.slug
    try:
        generation = FormGenerationStore(db, owner_id, storage_dir).update(slug, patch)
    except RevisionConflict:
        raise
    if generation is None:
        return None
    with db.begin():
        row = owned_template(db, owner_id, template_id)
        if row is None:
            return None
        template, artifact = row
        return template_view(db, template, artifact)


def test_fill(
    db: Session,
    owner_id: int,
    storage_dir: Path,
    template_id: int,
) -> tuple[FormGeneration, bytes] | None:
    with db.begin():
        row = owned_template(db, owner_id, template_id)
        if row is None:
            return None
        template, artifact = row
        generation = generation_from_template(template, artifact)
        if generation is None:
            raise TemplatePublishError("The Template has no configured field review")
        source = load_source(storage_dir, artifact)
    return generation, source


def publish_template(
    db: Session, owner_id: int, template_id: int
) -> TemplateDraftView | None:
    with db.begin():
        row = owned_template(db, owner_id, template_id, for_update=True)
        if row is None:
            return None
        template, artifact = row
        if template.status == "published":
            return template_view(db, template, artifact)
        generation = generation_from_template(template, artifact)
        if generation is None:
            raise TemplatePublishError("The Template has no reviewed field configuration")
        if generation.status != "ready" or any(
            candidate.status is CandidateStatus.PROPOSED for candidate in generation.candidates
        ):
            raise TemplatePublishError("Review every detected field before publishing the Template")
        accepted = [
            candidate
            for candidate in generation.candidates
            if candidate.status is CandidateStatus.ACCEPTED
        ]
        if not accepted:
            raise TemplatePublishError("A published Template requires at least one accepted Field")
        if len({candidate.id for candidate in accepted}) != len(accepted):
            raise TemplatePublishError("Accepted Field identifiers must be unique")
        try:
            validate_accepted_bindings(generation.blocks, accepted)
        except BindingError as exc:
            raise TemplatePublishError(str(exc)) from exc
        template.status = "published"
        template.published_at = datetime.now(UTC)
        return template_view(db, template, artifact)


def create_preset_template(
    db: Session,
    owner_id: int,
    storage_dir: Path,
    request: CreatePresetTemplateRequest,
) -> TemplateDraftView:
    with db.begin():
        preset = db.scalar(
            select(FormattingPreset).where(
                FormattingPreset.id == request.preset_id,
                FormattingPreset.status == "published",
                (FormattingPreset.is_builtin.is_(True) | (FormattingPreset.created_by == owner_id)),
            )
        )
        if preset is None:
            raise TemplatePublishError("The selected FormattingPreset is unavailable")
        if request.document_type_key not in preset_document_type_keys(preset.document_types):
            raise TemplatePublishError(
                "The selected FormattingPreset does not support the requested document type"
            )
        source = build_supported_preset_docx(
            request.document_type_key,
            request.org_constants,
            core=preset.core,
            advanced=preset.advanced,
        )
        filename = f"{request.name}.docx"
        generation = apply_preset_field_defaults(
            DocxAnalyzer().analyze(source, filename), request.document_type_key
        )
    store = FormGenerationStore(db, owner_id, storage_dir)
    store.create_template(
        generation,
        source,
        source_type=TemplateSourceType.PRESET,
        preset_id=preset.id,
        document_type_key=request.document_type_key,
        name=request.name,
        org_constants=cast(dict[str, object], request.org_constants),
    )
    with db.begin():
        row = owned_template_by_slug(db, owner_id, generation.id)
        if row is None:
            raise RuntimeError("The generated template was not persisted")
        template, artifact = row
        return template_view(db, template, artifact)


def build_supported_preset_docx(
    document_type_key: str,
    org_constants: dict[str, str],
    *,
    core: dict[str, Any] | None = None,
    advanced: dict[str, Any] | None = None,
) -> bytes:
    if document_type_key != "to_trinh":
        raise TemplatePublishError(
            "This PA04 renderer currently supports only the 'to_trinh' preset document type"
        )
    org_constants = {key: value.strip() for key, value in org_constants.items() if value.strip()}
    core = core or {}
    advanced = advanced or {}
    document = Document()
    _apply_page_format(document, core)
    default_font = _font_settings(core)
    _apply_default_font(document, default_font)
    layout = _as_mapping(advanced.get("layout"))
    header_layout = _as_mapping(layout.get("header"))
    if header_layout.get("type") == "borderless_table":
        header = _add_borderless_table(document, header_layout)
        national_core = _fit_national_header(core)
        _add_role_paragraph_to_cell(
            header.cell(0, 0),
            org_constants.get("governing_org", "CƠ QUAN CHỦ QUẢN"),
            "co_quan_chu_quan",
            core,
            advanced,
            default_font,
        )
        _add_role_paragraph_to_cell(
            header.cell(0, 0),
            org_constants.get("issuing_org", "CƠ QUAN BAN HÀNH"),
            "co_quan_ban_hanh",
            core,
            advanced,
            default_font,
        )
        _add_role_paragraph_to_cell(
            header.cell(0, 1),
            "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
            "quoc_hieu",
            national_core,
            advanced,
            default_font,
        )
        _add_role_paragraph_to_cell(
            header.cell(0, 1),
            "Độc lập - Tự do - Hạnh phúc",
            "tieu_ngu",
            national_core,
            advanced,
            default_font,
        )
    else:
        _add_role_paragraph(
            document,
            org_constants.get("governing_org", "CƠ QUAN CHỦ QUẢN"),
            "co_quan_chu_quan",
            core,
            advanced,
            default_font,
        )
        _add_role_paragraph(
            document,
            org_constants.get("issuing_org", "CƠ QUAN BAN HÀNH"),
            "co_quan_ban_hanh",
            core,
            advanced,
            default_font,
        )
        for text, role in (
            ("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "quoc_hieu"),
            ("Độc lập - Tự do - Hạnh phúc", "tieu_ngu"),
        ):
            _add_role_paragraph(document, text, role, core, advanced, default_font)
    _add_role_paragraph(document, "TỜ TRÌNH", "ten_loai", core, advanced, default_font)
    _apply_bottom_rule(document.paragraphs[-1], "ten_loai", advanced)
    _add_role_paragraph(
        document, "Về việc {{trich_yeu}}", "trich_yeu", core, advanced, default_font
    )
    _add_role_paragraph(
        document, "Kính gửi: {{kinh_gui}}", "kinh_gui", core, advanced, default_font
    )
    _add_role_paragraph(
        document,
        "Nội dung đề xuất: {{noi_dung_de_xuat}}",
        "body",
        core,
        advanced,
        default_font,
    )
    _add_role_paragraph(
        document,
        "Kinh phí dự kiến: {{kinh_phi_du_kien}}",
        "body",
        core,
        advanced,
        default_font,
    )
    footer_layout = _as_mapping(layout.get("footer"))
    if footer_layout.get("type") == "borderless_table":
        footer = _add_borderless_table(document, footer_layout)
        _add_role_paragraph_to_cell(
            footer.cell(0, 0), "Nơi nhận:", "noi_nhan_label", core, advanced, default_font
        )
        _add_role_paragraph_to_cell(
            footer.cell(0, 1),
            org_constants.get("signer_title", "NGƯỜI KÝ"),
            "chuc_vu",
            core,
            advanced,
            default_font,
        )
    else:
        _add_role_paragraph(
            document,
            org_constants.get("signer_title", "NGƯỜI KÝ"),
            "chuc_vu",
            core,
            advanced,
            default_font,
        )
    stream = BytesIO()
    document.save(stream)
    return stream.getvalue()


def _as_mapping(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def apply_preset_field_defaults(
    generation: FormGeneration, document_type_key: str
) -> FormGeneration:
    """Give known preset slots stable keys, labels, types, and deterministic rules."""
    if document_type_key != "to_trinh":
        return generation
    defaults: dict[str, tuple[str, FieldType, bool, int | None, str | None]] = {
        "trich_yeu": ("Trích yếu", FieldType.SHORT_TEXT, True, 10, None),
        "kinh_gui": ("Kính gửi", FieldType.SHORT_TEXT, False, None, None),
        "noi_dung_de_xuat": ("Nội dung đề xuất", FieldType.LONG_TEXT, True, 20, None),
        "kinh_phi_du_kien": ("Kinh phí dự kiến", FieldType.MONEY, False, None, "VND"),
    }
    for candidate in generation.candidates:
        field = defaults.get(candidate.label.casefold())
        if field is None:
            continue
        label, field_type, required, minimum_length, currency = field
        candidate.id = candidate.label.casefold()
        candidate.label = label
        candidate.type = field_type
        candidate.rules.required = required
        candidate.rules.min_length = minimum_length
        candidate.rules.currency = currency
    return generation


def preset_document_type_keys(document_types: dict[str, Any]) -> set[str]:
    keys: set[str] = set()
    for key, value in document_types.items():
        entry = _as_mapping(value)
        variants = entry.get("variants")
        if isinstance(variants, dict):
            keys.update(variant for variant in variants if isinstance(variant, str))
        else:
            keys.add(key)
    return keys


def _number(value: object) -> float | None:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _font_settings(core: dict[str, Any]) -> dict[str, Any]:
    return _as_mapping(core.get("font"))


def _fit_national_header(core: dict[str, Any]) -> dict[str, Any]:
    """Use the preset's smallest allowed national header sizes inside the header table.

    The header column is too narrow for the default size, which wraps the Quốc hiệu.
    """
    styles = dict(_as_mapping(core.get("styles")))
    for role in ("quoc_hieu", "tieu_ngu"):
        style = _as_mapping(styles.get(role))
        allowed = style.get("size_allowed")
        if not isinstance(allowed, list):
            continue
        sizes = [size for size in (_number(item) for item in allowed) if size is not None]
        if sizes:
            styles[role] = {**style, "size": min(sizes)}
    return {**core, "styles": styles}


def _apply_page_format(document: WordDocument, core: dict[str, Any]) -> None:
    page = _as_mapping(core.get("page"))
    section = document.sections[0]
    if page.get("size") == "A4":
        section.page_width = Mm(210)
        section.page_height = Mm(297)
    if page.get("orientation") == "landscape":
        section.orientation = WD_ORIENT.LANDSCAPE
        section.page_width = Mm(297)
        section.page_height = Mm(210)
    elif page.get("orientation") == "portrait":
        section.orientation = WD_ORIENT.PORTRAIT
    margins = _as_mapping(page.get("margin"))
    for key, attribute in (
        ("top", "top_margin"),
        ("bottom", "bottom_margin"),
        ("left", "left_margin"),
        ("right", "right_margin"),
    ):
        value = _number(margins.get(key))
        if value is not None:
            setattr(section, attribute, Mm(value))


def _add_borderless_table(document: WordDocument, layout: dict[str, Any]) -> Any:
    columns = layout.get("columns")
    column_count = len(columns) if isinstance(columns, list) and len(columns) >= 2 else 2
    table = document.add_table(rows=1, cols=column_count)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    if isinstance(columns, list) and len(columns) == column_count:
        ratios = [_number(value) for value in columns]
        if all(ratio is not None and ratio > 0 for ratio in ratios):
            total_ratio = sum(cast(float, ratio) for ratio in ratios)
            section = cast(Any, document.sections[0])
            available_width = (
                int(section.page_width) - int(section.left_margin) - int(section.right_margin)
            )
            for index, ratio in enumerate(ratios):
                width = Emu(round(available_width * cast(float, ratio) / total_ratio))
                table.columns[index].width = width
                table.cell(0, index).width = width
    table_properties = cast(Any, table._tbl).tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        border = OxmlElement(f"w:{edge}")
        border.set(qn("w:val"), "nil")
        borders.append(border)
    table_properties.append(borders)
    return table


def _add_role_paragraph_to_cell(
    cell: Any,
    text: str,
    role: str,
    core: dict[str, Any],
    advanced: dict[str, Any],
    default_font: dict[str, Any],
) -> None:
    paragraph = cell.paragraphs[0]
    if paragraph.text or paragraph.runs:
        paragraph = cell.add_paragraph()
    style = _role_style(role, core, advanced)
    _apply_paragraph_style(paragraph, style)
    run = paragraph.add_run(_apply_case(text, style.get("case")))
    _apply_run_style(run, style, default_font)


def _apply_bottom_rule(paragraph: Paragraph, role: str, advanced: dict[str, Any]) -> None:
    decorations = _as_mapping(advanced.get("decorations"))
    decoration = _as_mapping(decorations.get(role))
    if not _as_mapping(decoration.get("rule_below")):
        return
    properties = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "8")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "auto")
    borders.append(bottom)
    properties.append(borders)


def _apply_default_font(document: WordDocument, settings: dict[str, Any]) -> None:
    normal = cast(Any, document.styles["Normal"]).font
    family = settings.get("family")
    if isinstance(family, str) and family:
        normal.name = family
    color = settings.get("color")
    if isinstance(color, str) and len(color) == 6:
        try:
            normal.color.rgb = RGBColor.from_string(color)
        except ValueError:
            pass


def _role_style(role: str, core: dict[str, Any], advanced: dict[str, Any]) -> dict[str, Any]:
    style: dict[str, Any] = {}
    for block in (_as_mapping(core.get("styles")), _as_mapping(advanced.get("styles"))):
        style.update(_as_mapping(block.get(role)))
    return style


def _add_role_paragraph(
    document: WordDocument,
    text: str,
    role: str,
    core: dict[str, Any],
    advanced: dict[str, Any],
    default_font: dict[str, Any],
) -> None:
    style = _role_style(role, core, advanced)
    paragraph = document.add_paragraph()
    _apply_paragraph_style(paragraph, style)
    run = paragraph.add_run(_apply_case(text, style.get("case")))
    _apply_run_style(run, style, default_font)


def _apply_case(text: str, value: object) -> str:
    return text.upper() if value == "upper" else text


def _apply_paragraph_style(paragraph: Paragraph, style: dict[str, Any]) -> None:
    alignment_name = style.get("align")
    alignment = {
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "right": WD_ALIGN_PARAGRAPH.RIGHT,
        "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
    }.get(alignment_name) if isinstance(alignment_name, str) else None
    if alignment is not None:
        paragraph.alignment = alignment
    first_line_indent = _number(style.get("first_line_indent"))
    if first_line_indent is not None:
        paragraph.paragraph_format.first_line_indent = Mm(first_line_indent)
    for setting, attribute in (
        ("space_before_pt", "space_before"),
        ("space_after_pt", "space_after"),
    ):
        value = _number(style.get(setting))
        if value is not None:
            setattr(paragraph.paragraph_format, attribute, Pt(value))
    line_spacing = _number(style.get("line_spacing"))
    if line_spacing is not None:
        paragraph.paragraph_format.line_spacing = line_spacing


def _apply_run_style(run: Run, style: dict[str, Any], default_font: dict[str, Any]) -> None:
    font = run.font
    family = style.get("family", default_font.get("family"))
    if isinstance(family, str) and family:
        font.name = family
    size = _number(style.get("size"))
    if size is not None:
        font.size = Pt(size)
    for setting in ("bold", "italic"):
        value = style.get(setting)
        if isinstance(value, bool):
            setattr(font, setting, value)
    color = style.get("color", default_font.get("color"))
    if isinstance(color, str) and len(color) == 6:
        try:
            font.color.rgb = RGBColor.from_string(color)
        except ValueError:
            pass


def candidate_from_field(field: TemplateField) -> FieldCandidate:
    rules_data: dict[str, Any] = {"required": field.is_required}
    for rule in field.automatic_rules:
        rule_type = rule.get("rule_type")
        if isinstance(rule_type, str) and rule_type in FieldRules.model_fields:
            rules_data[rule_type] = rule.get("value")
    field_type = (
        FieldType.MONEY
        if field.field_type == TemplateFieldType.AMOUNT_OF_MONEY
        else FieldType(field.field_type)
    )
    return FieldCandidate(
        id=field.field_key,
        label=field.label,
        type=field_type,
        status=CandidateStatus.ACCEPTED,
        occurrences=[SourceLocation.model_validate(binding) for binding in field.bindings],
        methods=[DetectionMethod.MANUAL],
        confidence=1,
        instructions=[
            Instruction(text=line)
            for line in (field.instructions or "").splitlines()
            if line.strip()
        ],
        options=list(field.choice_options),
        rules=FieldRules.model_validate(rules_data),
    )


def generation_for_published_template(
    db: Session, template: DocumentTemplate, artifact: FileArtifact
) -> FormGeneration:
    fields = fields_for_template(db, template.id)
    return FormGeneration(
        id=template.slug,
        filename=artifact.original_filename,
        sha256=artifact.sha256,
        status="ready",
        revision=1,
        candidates=[candidate_from_field(field) for field in fields],
    )


def template_source_type(template: DocumentTemplate) -> TemplateSourceType:
    return TemplateSourceType(template.source_type)


def generated_storage_key() -> str:
    return f"template-sources/{uuid4()}.docx"
