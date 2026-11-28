from __future__ import annotations

import hashlib
import re
import zipfile
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from io import BytesIO
from typing import cast
from uuid import uuid4

from lxml import etree

from app.modules.templates.schemas import (
    AnalysisWarning,
    ChoiceOption,
    DetectionMethod,
    DocumentBlock,
    FieldCandidate,
    FieldType,
    FormGeneration,
    Instruction,
    SourceLocation,
)

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
V = "urn:schemas-microsoft-com:vml"
NS = {"w": W, "v": V}
SAFE_XML_PARSER = etree.XMLParser(resolve_entities=False, no_network=True)
MARKER_RE = re.compile(r"\{\{\s*([^{}\n]{1,120}?)\s*\}\}")
UNDERSCORE_RE = re.compile(r"_{3,}")
DOTTED_RE = re.compile(r"(?:[.…·]\s*){3,}")
CHECKBOX_RE = re.compile(r"[□☐☑☒▢■□]")
BOXED_CHARACTER_RE = re.compile(r"☐{6,}")
REFERENCE_PLACEHOLDER_RE = re.compile(r"(?:…{2,}|\.{6,}|·{2,})[.]?")
TAB_BLANK_RE = re.compile(r"\t+")
ENDS_WITH_BLANK_RE = re.compile(r"(?:…|[.·_]{2})[.…·_]*\s*$")
# Inside a date a single ellipsis already is a blank. It never ends in whitespace.
DATE_BLANK = r"(?:…|[._·]{2})(?:[ \t]?[.…·_])*"
DATE_CHAIN_RE = re.compile(
    rf"{DATE_BLANK}\s*(?:tháng|month)\s*{DATE_BLANK}\s*(?:năm|year)"
    rf"(?:\s*20(?=\s*[.…·_]))?\s*{DATE_BLANK}",
    flags=re.IGNORECASE,
)
MAX_BRACKET_CHARS = 600
MAX_BRACKET_LABEL = 80
LONG_BRACKET_HINTS = ("chi tiết", "trình bày", "mở đầu", "nêu ")
DATE_TERMS = ("ngày", "tháng", "năm", "date", "dob")
MONEY_TERMS = ("tiền", "kinh phí", "chi phí", "đồng", "vnđ", "vnd", "amount", "budget")
NUMBER_TERMS = ("số", "number", "mã", "code", "quantity", "số lượng")
LONG_TERMS = ("nội dung", "mô tả", "lý do", "trình bày", "ý kiến", "summary", "description")


@dataclass(frozen=True)
class CommentAnchor:
    comment_id: str
    block_id: str
    start: int
    end: int


class DocxAnalysisError(ValueError):
    pass


class DocxAnalyzer:
    """Reads OOXML directly so candidate locations survive formatting-run boundaries."""

    def analyze(self, payload: bytes, filename: str) -> FormGeneration:
        if not payload.startswith(b"PK"):
            raise DocxAnalysisError("Only .docx files are supported")
        try:
            with zipfile.ZipFile(BytesIO(payload)) as archive:
                document = etree.fromstring(archive.read("word/document.xml"), SAFE_XML_PARSER)
                comments = self._read_comments(archive)
                headers = self._read_parts(archive, "word/header")
                footers = self._read_parts(archive, "word/footer")
        except (KeyError, zipfile.BadZipFile, etree.XMLSyntaxError) as exc:
            raise DocxAnalysisError("The file is not a readable DOCX document") from exc

        blocks: list[DocumentBlock] = []
        anchors: list[CommentAnchor] = []
        body = document.find("w:body", NS)
        if body is None:
            raise DocxAnalysisError("The document has no body")
        self._read_container(body, "body", blocks, anchors)
        for part_name, root in headers:
            self._read_container(root, f"header:{part_name}", blocks, anchors, kind="header")
        for part_name, root in footers:
            self._read_container(root, f"footer:{part_name}", blocks, anchors, kind="footer")

        candidates, warnings = self._detect(blocks, anchors, comments)
        self._detect_vml_entry_fields(body, blocks, candidates)
        return FormGeneration(
            id=str(uuid4()),
            filename=filename,
            sha256=hashlib.sha256(payload).hexdigest(),
            status="needs_review",
            revision=1,
            blocks=blocks,
            candidates=candidates,
            warnings=warnings,
        )

    def _detect_vml_entry_fields(
        self, body: etree._Element, blocks: list[DocumentBlock], candidates: list[FieldCandidate]
    ) -> None:
        """Treat rows of aligned VML rectangles after a label as a fillable field."""
        blocks_by_id = {block.id: block for block in blocks}
        existing_blocks = {occ.block_id for field in candidates for occ in field.occurrences}

        def visit(container: etree._Element, path: str) -> None:
            paragraph_index = 0
            table_index = 0
            for child in container:
                if child.tag == f"{{{W}}}p":
                    block_id = f"{path}/p:{paragraph_index}"
                    paragraph_index += 1
                    rects = child.findall(".//v:rect", NS)
                    block = blocks_by_id.get(block_id)
                    if block is None or len(rects) < 6 or block_id in existing_blocks:
                        continue
                    raw_label = block.text.strip()
                    if not re.search(r"[:：]\s*$", raw_label):
                        continue
                    label = self._normal_label(re.sub(r"[:：]\s*$", "", raw_label))
                    candidate = self._new_candidate(
                        block,
                        len(block.text),
                        len(block.text),
                        label,
                        DetectionMethod.VML_FIELD,
                        0.9,
                    )
                    candidate.evidence.append(
                        f"Detected {len(rects)} aligned Word entry cells after the field label."
                    )
                    candidates.append(candidate)
                    existing_blocks.add(block_id)
                elif child.tag == f"{{{W}}}tbl":
                    table_path = f"{path}/tbl:{table_index}"
                    table_index += 1
                    for row_index, row in enumerate(child.findall("w:tr", NS)):
                        for cell_index, cell in enumerate(row.findall("w:tc", NS)):
                            visit(cell, f"{table_path}/r:{row_index}/c:{cell_index}")

        visit(body, "body")

    def _read_parts(
        self, archive: zipfile.ZipFile, prefix: str
    ) -> list[tuple[str, etree._Element]]:
        parts: list[tuple[str, etree._Element]] = []
        for name in archive.namelist():
            if name.startswith(prefix) and name.endswith(".xml"):
                try:
                    parts.append(
                        (
                            name.rsplit("/", 1)[-1],
                            etree.fromstring(archive.read(name), SAFE_XML_PARSER),
                        )
                    )
                except etree.XMLSyntaxError:
                    continue
        return parts

    def _read_comments(self, archive: zipfile.ZipFile) -> dict[str, str]:
        try:
            root = etree.fromstring(archive.read("word/comments.xml"), SAFE_XML_PARSER)
        except KeyError:
            return {}
        comments: dict[str, str] = {}
        for node in root.findall("w:comment", NS):
            comment_id = node.get(f"{{{W}}}id")
            if comment_id is not None:
                comments[comment_id] = self._element_text(node).strip()
        return comments

    def _read_container(
        self,
        container: etree._Element,
        path: str,
        blocks: list[DocumentBlock],
        anchors: list[CommentAnchor],
        *,
        kind: str = "paragraph",
    ) -> None:
        paragraph_index = 0
        table_index = 0
        for child in container:
            if child.tag == f"{{{W}}}p":
                block_id = f"{path}/p:{paragraph_index}"
                paragraph_index += 1
                text, paragraph_anchors = self._paragraph_text_and_anchors(child, block_id)
                blocks.append(DocumentBlock(id=block_id, kind=kind, text=text, path=block_id))
                anchors.extend(paragraph_anchors)
            elif child.tag == f"{{{W}}}tbl":
                table_path = f"{path}/tbl:{table_index}"
                table_index += 1
                self._read_table(child, table_path, blocks, anchors, kind)

    def _read_table(
        self,
        table: etree._Element,
        table_path: str,
        blocks: list[DocumentBlock],
        anchors: list[CommentAnchor],
        kind: str,
    ) -> None:
        rows = table.findall("w:tr", NS)
        for row_index, row in enumerate(rows):
            cells = row.findall("w:tc", NS)
            for cell_index, cell in enumerate(cells):
                cell_path = f"{table_path}/r:{row_index}/c:{cell_index}"
                before = len(blocks)
                self._read_container(cell, cell_path, blocks, anchors, kind="table_cell")
                for block in blocks[before:]:
                    block.parent_table = table_path

    def _paragraph_text_and_anchors(
        self, paragraph: etree._Element, block_id: str
    ) -> tuple[str, list[CommentAnchor]]:
        text_parts: list[str] = []
        active: dict[str, int] = {}
        anchors: list[CommentAnchor] = []
        for node in paragraph.iter():
            if node.tag == f"{{{W}}}commentRangeStart":
                comment_id = node.get(f"{{{W}}}id")
                if comment_id is not None:
                    active[comment_id] = len("".join(text_parts))
            elif node.tag == f"{{{W}}}commentRangeEnd":
                comment_id = node.get(f"{{{W}}}id")
                if comment_id is not None and comment_id in active:
                    anchors.append(
                        CommentAnchor(
                            comment_id, block_id, active.pop(comment_id), len("".join(text_parts))
                        )
                    )
            elif node.tag == f"{{{W}}}t":
                text_parts.append(node.text or "")
            elif node.tag == f"{{{W}}}tab":
                text_parts.append("\t")
            elif node.tag in {f"{{{W}}}br", f"{{{W}}}cr"}:
                text_parts.append("\n")
            elif node.tag == f"{{{W}}}sym":
                text_parts.append(self._symbol_text(node))
        return "".join(text_parts), anchors

    def _symbol_text(self, node: etree._Element) -> str:
        font = node.get(f"{{{W}}}font", "").casefold()
        value = node.get(f"{{{W}}}char", "")
        if font.startswith("wingdings") and value.upper() == "F0A3":
            return "☐"
        try:
            return chr(int(value, 16))
        except (TypeError, ValueError):
            return "\ufffc"

    def _element_text(self, element: etree._Element) -> str:
        values = cast(list[str], element.xpath(".//w:t/text()", namespaces=NS))
        return "".join(values)

    def _detect(
        self,
        blocks: list[DocumentBlock],
        anchors: list[CommentAnchor],
        comments: dict[str, str],
    ) -> tuple[list[FieldCandidate], list[AnalysisWarning]]:
        candidates: list[FieldCandidate] = []
        warnings: list[AnalysisWarning] = []
        by_label: dict[str, FieldCandidate] = {}
        bracket_labels: dict[str, int] = defaultdict(int)
        comment_by_block: dict[str, list[tuple[CommentAnchor, str]]] = defaultdict(list)
        for anchor in anchors:
            comment_text = comments.get(anchor.comment_id, "").strip()
            if comment_text:
                comment_by_block[anchor.block_id].append((anchor, comment_text))
        reference_definitions: dict[str, str] = {}
        for block in blocks:
            reference = re.match(r"\s*\((\d+)\)\s*(.+?)\s*$", block.text)
            if reference:
                reference_definitions[reference.group(1)] = reference.group(2).strip().rstrip(".")

        for block in blocks:
            if not block.text.strip() and block.kind != "table_cell":
                continue
            boxed_run = BOXED_CHARACTER_RE.search(block.text)
            if (
                boxed_run
                and block.kind == "table_cell"
                and not block.text[: boxed_run.start()].strip()
                and not block.text[boxed_run.end() :].strip()
            ):
                label = self._neighboring_table_cell_label(block, blocks)
                if label:
                    candidate = self._new_candidate(
                        block,
                        boxed_run.start(),
                        boxed_run.end(),
                        label,
                        DetectionMethod.BOXED_FIELD,
                        0.92,
                    )
                    candidate.rules.max_length = boxed_run.end() - boxed_run.start()
                    candidate.evidence.append(
                        f"Detected {candidate.rules.max_length} consecutive Wingdings "
                        "character-entry boxes."
                    )
                    self._merge_or_append(candidates, by_label, candidate, allow_merge=False)
                    continue
            marker_found = False
            for match in MARKER_RE.finditer(block.text):
                marker_found = True
                label = self._normal_label(match.group(1))
                candidate = self._new_candidate(
                    block, match.start(), match.end(), label, DetectionMethod.MARKER, 0.99
                )
                self._attach_comments(candidate, comment_by_block.get(block.id, []))
                self._merge_or_append(candidates, by_label, candidate, allow_merge=True)
            if marker_found:
                continue
            bracket_spans: list[tuple[int, int]] = []
            for start, end in self._bracket_spans(block.text):
                bracket = self._bracket_candidate(block, start, end, bracket_labels)
                if bracket is None:
                    continue
                self._attach_comments(bracket, comment_by_block.get(block.id, []))
                candidates.append(bracket)
                bracket_spans.append((start, end))
            reference_spans: list[tuple[int, int]] = []
            for match in REFERENCE_PLACEHOLDER_RE.finditer(block.text):
                if self._overlaps(match.start(), match.end(), bracket_spans):
                    continue
                reference = re.match(r"\s*\((\d+)\)", block.text[match.end() :])
                if not reference:
                    continue
                label, options = self._reference_field(reference.group(1), reference_definitions)
                candidate = self._new_candidate(
                    block, match.start(), match.end(), label, DetectionMethod.DOTTED_LINE, 0.88
                )
                if options:
                    candidate.type = FieldType.CHOICE
                    candidate.options = [
                        ChoiceOption(value=value.casefold().replace(" ", "_"), label=value)
                        for value in options
                    ]
                candidate.evidence.append(
                    f"Resolved placeholder reference ({reference.group(1)}) "
                    "from its note in the document."
                )
                self._merge_or_append(candidates, by_label, candidate, allow_merge=True)
                reference_spans.append((match.start(), match.end()))
            for match in CHECKBOX_RE.finditer(block.text):
                if self._overlaps(match.start(), match.end(), bracket_spans):
                    continue
                label = self._checkbox_label(block.text, match.start())
                if label:
                    group_label = self._neighboring_table_cell_label(block, blocks)
                    field_label = f"{group_label} — {label}" if group_label else label
                    candidate = self._new_candidate(
                        block,
                        match.start(),
                        match.end(),
                        field_label,
                        DetectionMethod.CHECKBOX,
                        0.84,
                    )
                    candidate.type = FieldType.CHOICE
                    candidate.options = [
                        ChoiceOption(value="checked", label="Đã chọn"),
                        ChoiceOption(value="unchecked", label="Chưa chọn"),
                    ]
                    candidate.evidence.append(
                        f"Detected a Wingdings checkbox for option '{label}'."
                    )
                    self._merge_or_append(candidates, by_label, candidate, allow_merge=False)
            for match in TAB_BLANK_RE.finditer(block.text):
                if self._overlaps(match.start(), match.end(), bracket_spans):
                    continue
                # Dots before the tab are the blank; text after it is already filled in.
                if ENDS_WITH_BLANK_RE.search(block.text[: match.start()]):
                    continue
                if self._is_prefilled(block.text[match.end() :]):
                    continue
                label = self._label_before_blank(block.text, match.start())
                if label and (
                    block.text[: match.start()].rstrip().endswith(":")
                    or re.match(r"\s*\d+\.", label)
                ):
                    end = match.end()
                    following_dots = re.match(r"\s*(?:[.…·]\s*){3,}", block.text[end:])
                    method = DetectionMethod.EMPTY_TABLE_CELL
                    if following_dots:
                        end += len(following_dots.group(0).rstrip())
                        method = DetectionMethod.DOTTED_LINE
                    candidate = self._new_candidate(
                        block, match.start(), end, label, method, 0.68 if following_dots else 0.58
                    )
                    candidates.append(candidate)
            claimed = [*reference_spans, *bracket_spans]
            blank_spans = [
                span
                for span in self._blank_spans(block.text)
                if not self._overlaps(span[0], span[1], claimed)
            ]
            date_groups = [
                group
                for group in self._date_spans(block.text)
                if not self._overlaps(group[0], group[1], claimed)
            ]
            dated = [(start, end) for start, end, _ in date_groups]
            for start, end, label in date_groups:
                candidate = self._new_candidate(
                    block, start, end, label, DetectionMethod.DOTTED_LINE, 0.72
                )
                candidate.type = FieldType.DATE
                candidate.options = []
                candidates.append(candidate)
            for start, end, method in blank_spans:
                if self._overlaps(start, end, dated):
                    continue
                if method is DetectionMethod.DOTTED_LINE and self._is_reference_dots(
                    block.text, start, end
                ):
                    continue
                if any(
                    candidate.occurrences[0].block_id == block.id
                    and candidate.occurrences[0].start <= start < candidate.occurrences[0].end
                    for candidate in candidates
                ):
                    continue
                label = self._label_before_blank(block.text, start)
                if label is None:
                    warnings.append(
                        AnalysisWarning(
                            code="ambiguous_blank",
                            message="A blank could not be associated with a label.",
                            block_id=block.id,
                        )
                    )
                    continue
                if self._is_heading_placeholder(block.text, start, end, label):
                    continue
                candidate = self._new_candidate(block, start, end, label, method, 0.62)
                self._attach_comments(candidate, comment_by_block.get(block.id, []))
                candidates.append(candidate)

        self._detect_empty_cells(blocks, candidates, by_label, warnings)
        self._detect_signature_fields(blocks, candidates)
        signature_cells = {
            re.sub(r"/p:\d+$", "", occurrence.block_id)
            for field in candidates
            if any("empty entry area below a signatory" in item for item in field.evidence)
            for occurrence in field.occurrences
        }
        warnings = [
            warning
            for warning in warnings
            if warning.block_id is None
            or not any(warning.block_id.startswith(f"{cell}/p:") for cell in signature_cells)
        ]
        self._propose_comment_only_fields(blocks, comment_by_block, candidates, by_label)
        return candidates, warnings

    def _reference_field(
        self, reference: str, definitions: dict[str, str]
    ) -> tuple[str, list[str]]:
        definition = definitions.get(reference, "")
        normalized = definition.casefold()
        if "cấp/cấp lại/gia hạn" in normalized or "cấp lại/gia hạn" in normalized:
            return "Hình thức đề nghị", ["Cấp", "Cấp lại", "Gia hạn"]
        if "tên cá nhân" in normalized or "tổ chức/doanh nghiệp" in normalized:
            return "Tên cá nhân, tổ chức/doanh nghiệp", []
        return self._normal_label(definition or f"Thông tin tham chiếu {reference}"), []

    def _neighboring_table_cell_label(
        self, block: DocumentBlock, blocks: list[DocumentBlock]
    ) -> str | None:
        match = re.match(r"^(.*?/r:\d+)/c:(\d+)/p:\d+$", block.id)
        if not match or int(match.group(2)) == 0:
            return None
        row_path, column = match.group(1), int(match.group(2))
        previous = [
            item.text.strip()
            for item in blocks
            if item.id.startswith(f"{row_path}/c:{column - 1}/p:") and item.text.strip()
        ]
        if not previous:
            return None
        return self._normal_label(" ".join(previous).rstrip(":："))

    def _detect_empty_cells(
        self,
        blocks: list[DocumentBlock],
        candidates: list[FieldCandidate],
        by_label: dict[str, FieldCandidate],
        warnings: list[AnalysisWarning],
    ) -> None:
        handled_ids = self._detect_repeating_table_fields(blocks, candidates)
        cells = [block for block in blocks if block.kind == "table_cell"]
        # Spacing paragraphs in a cell that already has text are layout, not blanks.
        occupied = {self._cell_path(cell.id) for cell in cells if cell.text.strip()}
        visited: set[str] = set()
        for index, cell in enumerate(cells):
            if cell.id in handled_ids:
                continue
            cell_path = self._cell_path(cell.id)
            if cell_path in occupied or cell_path in visited:
                continue
            visited.add(cell_path)
            if any(
                occurrence.block_id == cell.id
                for field in candidates
                for occurrence in field.occurrences
            ):
                continue
            prior = cells[index - 1] if index else None
            label = (
                self._normal_label(prior.text)
                if prior and prior.parent_table == cell.parent_table and prior.text.strip()
                else None
            )
            if label is None or self._is_non_field_table_label(label):
                warnings.append(
                    AnalysisWarning(
                        code="empty_cell_without_label",
                        message=(
                            "An empty table cell needs creator review because no "
                            "adjacent label was found."
                        ),
                        block_id=cell.id,
                    )
                )
                continue
            candidate = self._new_candidate(
                cell, 0, 0, label, DetectionMethod.EMPTY_TABLE_CELL, 0.56
            )
            if re.search(r"(?:CMND|CCCD|định danh cá nhân)", label, flags=re.IGNORECASE):
                row_prefix, cell_index = self._table_cell_coordinates(cell.id)
                if row_prefix is not None and cell_index is not None:
                    following = []
                    for possible in cells:
                        possible_row, possible_index = self._table_cell_coordinates(possible.id)
                        if (
                            possible_row == row_prefix
                            and possible_index is not None
                            and possible_index >= cell_index
                            and not possible.text.strip()
                        ):
                            following.append((possible_index, possible))
                    following.sort(key=lambda item: item[0])
                    contiguous = 0
                    for expected, (actual, member) in enumerate(following, start=cell_index):
                        if actual != expected:
                            break
                        contiguous += 1
                        handled_ids.add(member.id)
                    if contiguous >= 6:
                        candidate.rules.max_length = contiguous
                        candidate.evidence.append(
                            f"Detected {contiguous} adjacent empty digit cells in the source table."
                        )
            self._merge_or_append(candidates, by_label, candidate, allow_merge=False)

    def _table_cell_coordinates(self, block_id: str) -> tuple[str | None, int | None]:
        match = re.match(r"^(.*?/tbl:\d+/r:\d+)/c:(\d+)/p:\d+$", block_id)
        return (match.group(1), int(match.group(2))) if match else (None, None)

    def _detect_repeating_table_fields(
        self, blocks: list[DocumentBlock], candidates: list[FieldCandidate]
    ) -> set[str]:
        """Map blank rows under a multi-column header to their column labels."""
        tables: dict[str, dict[tuple[int, int], list[DocumentBlock]]] = defaultdict(
            lambda: defaultdict(list)
        )
        for block in blocks:
            if block.kind != "table_cell" or not block.parent_table:
                continue
            match = re.match(r"^.*?/r:(\d+)/c:(\d+)/p:\d+$", block.id)
            if match:
                tables[block.parent_table][(int(match.group(1)), int(match.group(2)))].append(block)

        handled: set[str] = set()
        for table in tables.values():
            header_cells = {
                column: " ".join(part.text.strip() for part in parts if part.text.strip()).strip()
                for (row, column), parts in table.items()
                if row == 0
            }
            if sum(bool(label) for label in header_cells.values()) < 4:
                continue
            for (row, column), parts in sorted(table.items()):
                if row == 0:
                    continue
                if any(part.text.strip() for part in parts):
                    continue
                if column == 0:
                    handled.update(part.id for part in parts)
                    continue
                header = header_cells.get(column, "")
                if not header:
                    continue
                if re.fullmatch(
                    r"(?:TT|STT|Số thứ tự|Thứ tự)", header.strip(), flags=re.IGNORECASE
                ):
                    handled.update(part.id for part in parts)
                    continue
                label = self._normal_label(f"Thành viên {row}: {header}")
                candidate = self._new_candidate(
                    parts[0], 0, 0, label, DetectionMethod.EMPTY_TABLE_CELL, 0.78
                )
                candidate.evidence.append(
                    f"Mapped to the '{header}' column header in a repeated member table row."
                )
                candidates.append(candidate)
                handled.update(part.id for part in parts)
        return handled

    def _detect_signature_fields(
        self, blocks: list[DocumentBlock], candidates: list[FieldCandidate]
    ) -> None:
        cells: dict[str, list[DocumentBlock]] = defaultdict(list)
        for block in blocks:
            if block.kind != "table_cell":
                continue
            cell_path = re.sub(r"/p:\d+$", "", block.id)
            cells[cell_path].append(block)
        existing = {occurrence.block_id for field in candidates for occurrence in field.occurrences}
        for cell_blocks in cells.values():
            cell_blocks.sort(key=lambda block: int(block.id.rsplit(":", 1)[-1]))
            text_blocks = [block for block in cell_blocks if block.text.strip()]
            if not text_blocks:
                continue
            heading = " ".join(block.text.strip() for block in text_blocks)
            if not re.search(r"ý kiến|người kê khai", heading, flags=re.IGNORECASE):
                continue
            blank = next(
                (
                    block
                    for block in cell_blocks
                    if not block.text.strip() and block.id not in existing
                ),
                None,
            )
            if blank is None:
                continue
            heading_match = re.search(
                r"(?:Ý KIẾN[^\(\n]*|NGƯỜI KÊ KHAI)", heading, flags=re.IGNORECASE
            )
            label = (
                self._normal_label(heading_match.group(0)) if heading_match else "Chữ ký và ý kiến"
            )
            label = re.sub(r"\s*\(\d+\)\s*$", "", label).strip()
            if "người kê khai" in label.casefold():
                label = "Chữ ký và họ tên người kê khai"
            candidate = self._new_candidate(
                blank, 0, 0, label, DetectionMethod.EMPTY_TABLE_CELL, 0.72
            )
            candidate.evidence.append(
                "Detected an empty entry area below a signatory or opinion heading."
            )
            candidates.append(candidate)
            existing.add(blank.id)

    def _is_non_field_table_label(self, label: str) -> bool:
        normalized = label.strip().casefold()
        if normalized.startswith(("(", "ký,", "độc lập - tự do - hạnh phúc")):
            return True
        if normalized in {"quốc hiệu", "tiêu ngữ", "cộng hòa xã hội chủ nghĩa việt nam"}:
            return True
        return False

    def _blank_spans(self, text: str) -> list[tuple[int, int, DetectionMethod]]:
        spans = [
            (match.start(), match.end(), DetectionMethod.UNDERSCORE)
            for match in UNDERSCORE_RE.finditer(text)
        ]
        spans.extend(
            (match.start(), self._trimmed_end(match), DetectionMethod.DOTTED_LINE)
            for match in DOTTED_RE.finditer(text)
        )
        spans.sort()
        merged: list[tuple[int, int, DetectionMethod]] = []
        for start, end, method in spans:
            if merged:
                prior_start, prior_end, prior_method = merged[-1]
                between = text[prior_end:start]
                if start <= prior_end or (
                    len(between) <= 3 and re.fullmatch(r"[\s/.,:]*", between)
                ):
                    merged[-1] = (
                        prior_start,
                        end,
                        prior_method if prior_method == method else DetectionMethod.DOTTED_LINE,
                    )
                    continue
            merged.append((start, end, method))
        return merged

    def _trimmed_end(self, match: re.Match[str]) -> int:
        """A blank ends at its last placeholder character, not in the following space."""
        return match.start() + len(match.group(0).rstrip())

    def _checkbox_label(self, text: str, position: int) -> str | None:
        first_checkbox = CHECKBOX_RE.search(text)
        if first_checkbox:
            question = text[: first_checkbox.start()].rstrip()
            colon = max(question.rfind(":"), question.rfind("："))
            if colon >= 0:
                question = question[:colon].split("\t")[-1].strip()
                question = re.sub(r"^\s*\d+\.\s*", "", question)
                if question:
                    return self._normal_label(question)
        checkbox = CHECKBOX_RE.search(text[position:])
        marker = checkbox.group(0) if checkbox else "☐"
        before = text[:position]
        prior_checkbox = list(CHECKBOX_RE.finditer(before))
        left_chunk = before[prior_checkbox[-1].end() :] if prior_checkbox else before
        after_position = position + len(marker)
        right_chunk = CHECKBOX_RE.split(text[after_position:], maxsplit=1)[0]
        left_chunk = left_chunk.rsplit("\t", 1)[-1]
        if ":" in left_chunk or "：" in left_chunk:
            left_chunk = re.split(r"[:：]", left_chunk)[-1]
        left = re.sub(r"\s+", " ", left_chunk).strip(" \t:：,;.-")
        right = re.sub(r"\s+", " ", right_chunk).strip(" \t:：,;.-")
        left_gap = len(left_chunk) - len(left_chunk.rstrip())
        right_gap = len(right_chunk) - len(right_chunk.lstrip())
        if left and (not right or left_gap < right_gap):
            option = left
        elif right:
            option = right
        else:
            return self._label_before_blank(text, position)
        option = re.sub(r"^\s*\d+\.\s*", "", option)
        # Adjacent option runs can contain old labels; keep the nearest short choice.
        words = option.split()
        if len(words) > 5:
            option = " ".join(words[-5:])
        return self._normal_label(option) if option else None

    def _date_spans(self, text: str) -> list[tuple[int, int, str]]:
        """Group only "<day> tháng <month> năm <year>"; never other words between blanks."""
        groups: list[tuple[int, int, str]] = []
        for match in DATE_CHAIN_RE.finditer(text):
            start = match.start()
            label_match = re.search(
                r"([^;\t\n]*?(?:ngày|date)[^;\t\n]*?)\s*[:：]?\s*$",
                text[max(0, start - 60) : start],
                flags=re.IGNORECASE,
            )
            raw = re.sub(r"^[\s.…·_,\d]+", "", label_match.group(1)) if label_match else ""
            # A bare "ngày", or a prefix that is really a sentence, makes a poor label.
            generic = (
                raw.strip().casefold() in {"", "ngày", "date"}
                or len(raw) > 40
                or bool(re.search(DATE_BLANK, raw))
                or "[" in raw
                or "]" in raw
            )
            label = "Ngày, tháng, năm" if generic else self._normal_label(raw)
            groups.append((start, match.end(), label))
        return groups

    def _overlaps(self, start: int, end: int, spans: list[tuple[int, int]]) -> bool:
        return any(start < other_end and end > other_start for other_start, other_end in spans)

    def _cell_path(self, block_id: str) -> str:
        return re.sub(r"/p:\d+$", "", block_id)

    def _is_prefilled(self, after_tab: str) -> bool:
        """True when ordinary text, not another label or blank, follows a tab."""
        segment = after_tab.split("\t", 1)[0].strip()
        return bool(segment) and not (
            re.match(r"[.…·_]|\d+\.", segment) or ":" in segment or "：" in segment
        )

    def _bracket_spans(self, text: str) -> list[tuple[int, int]]:
        """Outermost balanced [...] ranges; unmatched brackets are ignored."""
        opened: list[int] = []
        pairs: list[tuple[int, int]] = []
        for index, character in enumerate(text):
            if character == "[":
                opened.append(index)
            elif character == "]" and opened:
                pairs.append((opened.pop(), index + 1))
        outermost: list[tuple[int, int]] = []
        for start, end in sorted(pairs):
            if not outermost or start >= outermost[-1][1]:
                outermost.append((start, end))
        return outermost

    def _bracket_candidate(
        self,
        block: DocumentBlock,
        start: int,
        end: int,
        seen_labels: dict[str, int],
    ) -> FieldCandidate | None:
        inner = block.text[start + 1 : end - 1].strip()
        has_words = any(character.isalpha() for character in inner)
        # "[1]" is a citation; "[...]" is an unnamed blank.
        if len(inner) > MAX_BRACKET_CHARS or not (has_words or re.search(r"…|\.{2,}", inner)):
            return None
        hint = inner.rstrip(" .…")
        if has_words:
            head = re.split(r"\s+[–—-]\s+ví dụ\b|:\s", hint, flags=re.IGNORECASE)[0]
            label = self._normal_label(head.rstrip(" .…/"))
        else:
            label = self._label_before_blank(block.text, start) or "Nội dung"
        if len(label) > MAX_BRACKET_LABEL:
            label = label[: MAX_BRACKET_LABEL - 1].rsplit(" ", 1)[0] + "…"
        seen_labels[label.casefold()] += 1
        occurrence_number = seen_labels[label.casefold()]
        distinct = label if occurrence_number == 1 else f"{label} ({occurrence_number})"
        candidate = self._new_candidate(
            block, start, end, distinct, DetectionMethod.BRACKET, 0.8
        )
        lowered = hint.casefold()
        if lowered.startswith("ngày"):
            candidate.type = FieldType.DATE
        elif any(term in lowered for term in LONG_BRACKET_HINTS):
            candidate.type = FieldType.LONG_TEXT
        else:
            candidate.type = FieldType.SHORT_TEXT
        candidate.options = []
        if has_words and hint != label:
            candidate.instructions.append(Instruction(text=inner))
        return candidate

    def _propose_comment_only_fields(
        self,
        blocks: list[DocumentBlock],
        comment_by_block: dict[str, list[tuple[CommentAnchor, str]]],
        candidates: list[FieldCandidate],
        by_label: dict[str, FieldCandidate],
    ) -> None:
        fields_by_block = {
            occ.block_id for candidate in candidates for occ in candidate.occurrences
        }
        blocks_by_id = {block.id: block for block in blocks}
        for block_id, entries in comment_by_block.items():
            if block_id in fields_by_block:
                continue
            block = blocks_by_id[block_id]
            for anchor, comment in entries:
                anchor_text = block.text[anchor.start : anchor.end].strip()
                if not anchor_text:
                    continue
                candidate = self._new_candidate(
                    block,
                    anchor.start,
                    anchor.end,
                    self._normal_label(anchor_text),
                    DetectionMethod.COMMENT,
                    0.44,
                )
                candidate.instructions.append(
                    Instruction(
                        text=comment, source=self._location(block, anchor.start, anchor.end)
                    )
                )
                candidate.evidence.append(
                    "A Word comment is attached to this text; confirm it is a filling instruction."
                )
                self._merge_or_append(candidates, by_label, candidate, allow_merge=False)

    def _new_candidate(
        self,
        block: DocumentBlock,
        start: int,
        end: int,
        label: str,
        method: DetectionMethod,
        confidence: float,
    ) -> FieldCandidate:
        field_type = self._infer_type(label)
        options = []
        if field_type is FieldType.CHOICE:
            pairs = (
                (("yes", "Có"), ("no", "Không"))
                if re.search(r"có\s*/\s*không", label, flags=re.IGNORECASE)
                else (("male", "Nam"), ("female", "Nữ"))
            )
            options = [
                ChoiceOption(value=value, label=option_label) for value, option_label in pairs
            ]
        return FieldCandidate(
            id=str(uuid4()),
            label=label,
            type=field_type,
            occurrences=[self._location(block, start, end)],
            methods=[method],
            confidence=confidence,
            evidence=[f"Detected from {method.value.replace('_', ' ')}."],
            options=options,
        )

    def _location(self, block: DocumentBlock, start: int, end: int) -> SourceLocation:
        return SourceLocation(
            block_id=block.id,
            start=start,
            end=end,
            path=block.path,
            excerpt=block.text[max(0, start - 30) : min(len(block.text), end + 30)],
        )

    def _attach_comments(
        self, candidate: FieldCandidate, comments: Iterable[tuple[CommentAnchor, str]]
    ) -> None:
        occurrence = candidate.occurrences[0]
        for anchor, text in comments:
            if anchor.end >= occurrence.start and anchor.start <= occurrence.end:
                candidate.instructions.append(
                    Instruction(
                        text=text,
                        source=SourceLocation(
                            block_id=anchor.block_id,
                            start=anchor.start,
                            end=anchor.end,
                            path=occurrence.path,
                            excerpt=occurrence.excerpt,
                        ),
                    )
                )

    def _merge_or_append(
        self,
        candidates: list[FieldCandidate],
        by_label: dict[str, FieldCandidate],
        candidate: FieldCandidate,
        *,
        allow_merge: bool,
    ) -> None:
        normalized = candidate.label.casefold()
        existing = by_label.get(normalized)
        if allow_merge and existing and existing.type == candidate.type:
            existing.occurrences.extend(candidate.occurrences)
            existing.methods = list(dict.fromkeys([*existing.methods, *candidate.methods]))
            existing.instructions.extend(candidate.instructions)
            existing.confidence = max(existing.confidence, candidate.confidence)
            return
        candidates.append(candidate)
        if allow_merge:
            by_label[normalized] = candidate

    def _normal_label(self, raw: str) -> str:
        label = re.sub(r"\s+", " ", raw.strip().strip(":.-_"))
        return label[:255] or "Untitled field"

    def _label_before_blank(self, text: str, start: int) -> str | None:
        prefix = text[:start].rstrip()
        prefix = prefix.rstrip("\t ")
        prefix = re.sub(r"[:\-–]\s*$", "", prefix)
        if not prefix:
            return None
        # A blank is a boundary: only the nearest label segment belongs to it.
        tail = re.split(r"[\n;\t]", prefix)[-1].strip()
        tail = re.sub(r"(?:[.…·]\s*){2,}$", "", tail).strip()
        previous_blanks = list(re.finditer(r"(?:[.…·]\s*){3,}|_{3,}", tail))
        if previous_blanks:
            tail = tail[previous_blanks[-1].end() :].strip()
        if ":" in tail:
            tail = tail.rsplit(":", 1)[-1].strip() or tail.rsplit(":", 1)[0].strip()
        # When numbered fields share a paragraph, keep the nearest numbered label.
        numbered = list(
            re.finditer(r"(?:^|\s)(\d{1,2})\.\s+([^:;\t]+?)(?=\s+\d{1,2}\.\s+|$)", tail)
        )
        if numbered:
            tail = f"{numbered[-1].group(1)}. {numbered[-1].group(2).strip()}"
        if not any(character.isalnum() for character in tail):
            return None
        return self._normal_label(tail) if len(tail) <= 120 else None

    def _is_heading_placeholder(self, text: str, start: int, end: int, label: str) -> bool:
        """Skip a blank embedded in an all-caps heading with a parenthetical note."""
        suffix = text[end:]
        return label.isupper() and bool(re.match(r"\s*\.?\s*\(\d+\)\s*[A-ZÀ-ỸĐ\s]+", suffix))

    def _is_reference_dots(self, text: str, start: int, end: int) -> bool:
        left = text[:start].rstrip()
        right = text[end:].lstrip()
        # Count what is printed: one ellipsis character is three dots.
        short_dots = len(text[start:end].replace("…", "...")) <= 8
        numeric_reference = bool(re.match(r"\d+\s*\.", right) or re.search(r"\.\s*\d+$", left))
        return short_dots and numeric_reference

    def _infer_type(self, label: str) -> FieldType:
        lower = label.casefold()
        if re.search(r"giới tính|có\s*/\s*không", lower):
            return FieldType.CHOICE
        if any(term in lower for term in DATE_TERMS):
            return FieldType.DATE
        if any(term in lower for term in MONEY_TERMS):
            return FieldType.MONEY
        if any(term in lower for term in LONG_TERMS):
            return FieldType.LONG_TEXT
        if any(term in lower for term in NUMBER_TERMS):
            return FieldType.NUMBER
        return FieldType.SHORT_TEXT
