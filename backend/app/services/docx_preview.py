from __future__ import annotations

from collections import defaultdict
from html import escape
from io import BytesIO
import re
from zipfile import BadZipFile, ZipFile

from lxml import etree

from app.models import FormGeneration
from app.services.docx_analyzer import NS, W

DOTTED_BLANK_RE = re.compile(r"(?:[.…·]\s*){8,}")


class DocxPreviewError(ValueError):
    pass


class DocxPreviewRenderer:
    """Render the document's core OOXML layout into safe, readable preview HTML."""

    def render(self, source: bytes, generation: FormGeneration) -> str:
        try:
            with ZipFile(BytesIO(source)) as archive:
                document = etree.fromstring(archive.read("word/document.xml"))
        except (KeyError, BadZipFile, etree.XMLSyntaxError) as exc:
            raise DocxPreviewError("The source DOCX cannot be rendered") from exc

        highlights: dict[str, list[tuple[int, int, str, str]]] = defaultdict(list)
        for field in generation.candidates:
            if field.status.value == "rejected":
                continue
            for location in field.occurrences:
                highlights[location.block_id].append((location.start, location.end, field.label, field.id))

        body = document.find("w:body", NS)
        if body is None:
            raise DocxPreviewError("The source DOCX has no document body")
        section = body.find("w:sectPr", NS)
        page_size = section.find("w:pgSz", NS) if section is not None else None
        page_width = int(page_size.get(f"{{{W}}}w", "11906")) if page_size is not None else 11906
        page_height = int(page_size.get(f"{{{W}}}h", "16838")) if page_size is not None else 16838
        margins = section.find("w:pgMar", NS) if section is not None else None
        page_style = f"width:{page_width / 15:.2f}px;min-height:{page_height / 15:.2f}px"
        if margins is not None:
            page_style += f";padding:{int(margins.get(f'{{{W}}}top', '1134')) / 15:.2f}px {int(margins.get(f'{{{W}}}right', '1134')) / 15:.2f}px {int(margins.get(f'{{{W}}}bottom', '1134')) / 15:.2f}px {int(margins.get(f'{{{W}}}left', '1701')) / 15:.2f}px"
        suppressed_paragraphs = self._add_unlabeled_dotted_blanks(body, "body", highlights)
        return f'<div class="docx-preview-page" style="{page_style}">{self._container_html(body, "body", highlights, suppressed_paragraphs)}</div>'

    def _add_unlabeled_dotted_blanks(self, container: etree._Element, path: str, highlights: dict[str, list[tuple[int, int, str, str]]]) -> set[str]:
        """Render unlabelled dotted lines, grouping consecutive answer lines into one area."""
        suppressed: set[str] = set()
        paragraph_index = 0
        table_index = 0
        children = list(container)
        index = 0
        while index < len(children):
            child = children[index]
            if child.tag == f"{{{W}}}p":
                block_id = f"{path}/p:{paragraph_index}"
                text = self._paragraph_text(child)
                # A run of paragraphs made solely of dotted lines is one large
                # multiline answer area in the source form, not many fields.
                area_end = index + 1
                area_paragraphs = [child]
                if re.fullmatch(r"[\s.…·]{8,}", text):
                    while area_end < len(children) and children[area_end].tag == f"{{{W}}}p" and re.fullmatch(r"[\s.…·]{8,}", self._paragraph_text(children[area_end])):
                        area_paragraphs.append(children[area_end])
                        area_end += 1
                if len(area_paragraphs) > 1:
                    field_id = f"preview-area-{len(area_paragraphs)}"
                    match = DOTTED_BLANK_RE.search(text)
                    if match:
                        highlights[block_id].append((match.start(), match.end(), "Thông tin cần điền", field_id))
                    for offset in range(1, len(area_paragraphs)):
                        suppressed.add(f"{path}/p:{paragraph_index + offset}")
                    paragraph_index += len(area_paragraphs)
                    index = area_end
                    continue

                paragraph_index += 1
                paragraph_text = text
                occupied = [(start, end) for start, end, _, _ in highlights.get(block_id, [])]
                for match_index, match in enumerate(DOTTED_BLANK_RE.finditer(paragraph_text)):
                    if any(start < match.end() and end > match.start() for start, end in occupied):
                        continue
                    highlights[block_id].append((match.start(), match.end(), "Thông tin cần điền", f"preview-blank-{paragraph_index}-{match_index}"))
            elif child.tag == f"{{{W}}}tbl":
                table_path = f"{path}/tbl:{table_index}"
                table_index += 1
                for row_index, row in enumerate(child.findall("w:tr", NS)):
                    for cell_index, cell in enumerate(row.findall("w:tc", NS)):
                        suppressed.update(self._add_unlabeled_dotted_blanks(cell, f"{table_path}/r:{row_index}/c:{cell_index}", highlights))
            index += 1
        return suppressed

    def _paragraph_text(self, paragraph: etree._Element) -> str:
        parts: list[str] = []
        for node in paragraph.iter():
            if node.tag == f"{{{W}}}pict" or any(parent.tag == f"{{{W}}}pict" for parent in node.iterancestors()):
                continue
            if node.tag == f"{{{W}}}t":
                parts.append(node.text or "")
            elif node.tag == f"{{{W}}}tab":
                parts.append("\t")
            elif node.tag in {f"{{{W}}}br", f"{{{W}}}cr"}:
                parts.append("\n")
            elif node.tag == f"{{{W}}}sym":
                parts.append(self._symbol_text(node))
        return "".join(parts)

    def _symbol_text(self, node: etree._Element) -> str:
        font = node.get(f"{{{W}}}font", "").casefold()
        value = node.get(f"{{{W}}}char", "")
        if font.startswith("wingdings") and value.upper() == "F0A3":
            return "☐"
        try:
            return chr(int(value, 16))
        except (TypeError, ValueError):
            return "\uFFFC"

    def _container_html(self, container: etree._Element, path: str, highlights: dict[str, list[tuple[int, int, str, str]]], suppressed: set[str]) -> str:
        parts: list[str] = []
        paragraph_index = 0
        table_index = 0
        for child in container:
            if child.tag == f"{{{W}}}p":
                block_id = f"{path}/p:{paragraph_index}"
                paragraph_index += 1
                if block_id not in suppressed:
                    parts.append(self._paragraph_html(child, block_id, highlights.get(block_id, [])))
            elif child.tag == f"{{{W}}}tbl":
                table_path = f"{path}/tbl:{table_index}"
                table_index += 1
                parts.append(self._table_html(child, table_path, highlights, suppressed))
        return "".join(parts)

    def _table_html(self, table: etree._Element, table_path: str, highlights: dict[str, list[tuple[int, int, str, str]]], suppressed: set[str]) -> str:
        grid = table.findall("w:tblGrid/w:gridCol", NS)
        grid_widths = [int(col.get(f"{{{W}}}w", "0")) for col in grid]
        table_width = sum(grid_widths)
        rows: list[str] = []
        for row_index, row in enumerate(table.findall("w:tr", NS)):
            cells: list[str] = []
            column_index = 0
            row_cells = row.findall("w:tc", NS)
            cell_index = 0
            while cell_index < len(row_cells):
                cell = row_cells[cell_index]
                cell_path = f"{table_path}/r:{row_index}/c:{cell_index}"
                span_node = cell.find("w:tcPr/w:gridSpan", NS)
                colspan = int(span_node.get(f"{{{W}}}val", "1")) if span_node is not None else 1
                field = next((item for key, entries in highlights.items() if key.startswith(f"{cell_path}/p:") for item in entries if re.search(r"(?:CMND|CCCD|định danh cá nhân)", item[2], flags=re.IGNORECASE)), None)
                previous_text = self._paragraph_text(row_cells[cell_index - 1]) if cell_index else ""
                digit_group = 1
                if field and re.search(r"(?:CMND|CCCD|định danh cá nhân)", previous_text, flags=re.IGNORECASE):
                    while cell_index + digit_group < len(row_cells) and not self._container_text(row_cells[cell_index + digit_group]).strip():
                        digit_group += 1
                    if digit_group < 6:
                        digit_group = 1
                else:
                    digit_group = 1
                if digit_group > 1:
                    colspan = digit_group
                cell_width = sum(grid_widths[column_index:column_index + colspan]) if grid_widths else 0
                cell_style = f' style="width:{cell_width / table_width * 100:.3f}%"' if table_width and cell_width else ""
                content = self._container_html(cell, cell_path, highlights, suppressed)
                cell_class = ""
                if digit_group > 1 and field:
                    one_cell_width_pt = (grid_widths[column_index] / 20) if grid_widths else 24
                    content = content.replace('class="docx-form-field"', 'class="docx-form-field docx-form-field-number-cells"', 1)
                    content = re.sub(r'style="width:\d+px"', f'style="width:100%;height:24px;--slot-width:{one_cell_width_pt:.3f}pt"', content, count=1)
                    cell_class = ' class="docx-number-grid-group"'
                cells.append(f"<td colspan=\"{colspan}\"{cell_class}{cell_style}>{content}</td>")
                column_index += colspan
                cell_index += colspan
            rows.append(f"<tr>{''.join(cells)}</tr>")
        properties = table.find("w:tblPr", NS)
        width_node = properties.find("w:tblW", NS) if properties is not None else None
        width = width_node.get(f"{{{W}}}w") if width_node is not None else None
        width_type = width_node.get(f"{{{W}}}type") if width_node is not None else None
        table_style = ' style="table-layout:fixed"'
        if width and width_type == "dxa" and width != "0":
            table_style = f' style="table-layout:fixed;width:{int(width) / 15:.2f}px"'
        return f'<table class="docx-preview-table"{table_style}><tbody>{"".join(rows)}</tbody></table>'

    def _container_text(self, container: etree._Element) -> str:
        return "".join(self._paragraph_text(paragraph) for paragraph in container.findall(".//w:p", NS))

    def _paragraph_html(self, paragraph: etree._Element, block_id: str, highlights: list[tuple[int, int, str, str]]) -> str:
        alignment = paragraph.find("w:pPr/w:jc", NS)
        align = alignment.get(f"{{{W}}}val") if alignment is not None else "left"
        css_align = {"center": "center", "right": "right", "both": "justify"}.get(align or "", "left")
        paragraph_style = f"text-align:{css_align}"
        ppr = paragraph.find("w:pPr", NS)
        spacing = ppr.find("w:spacing", NS) if ppr is not None else None
        if spacing is not None:
            before, after = spacing.get(f"{{{W}}}before"), spacing.get(f"{{{W}}}after")
            if before: paragraph_style += f";margin-top:{int(before) / 15:.2f}px"
            if after: paragraph_style += f";margin-bottom:{int(after) / 15:.2f}px"
            line = spacing.get(f"{{{W}}}line")
            if line and spacing.get(f"{{{W}}}lineRule") == "exact": paragraph_style += f";line-height:{int(line) / 15:.2f}px"
        indent = ppr.find("w:ind", NS) if ppr is not None else None
        if indent is not None:
            left = indent.get(f"{{{W}}}left") or indent.get(f"{{{W}}}start")
            first = indent.get(f"{{{W}}}firstLine")
            if left: paragraph_style += f";margin-left:{int(left) / 15:.2f}px"
            if first: paragraph_style += f";text-indent:{int(first) / 15:.2f}px"
        text_offset = 0
        runs: list[str] = []
        floating: list[str] = []
        rendered_controls: set[str] = set()
        has_vml_entry = bool(paragraph.findall(".//v:rect", NS))
        if not has_vml_entry:
            for start, end, label, field_id in highlights:
                if start == end == 0:
                    runs.append(self._form_control(label, field_id))
                    rendered_controls.add(field_id)
        for child in paragraph:
            rendered, text_offset, overlays = self._paragraph_child(child, text_offset, highlights, rendered_controls)
            runs.append(rendered)
            floating.extend(overlays)
        vml_rects = paragraph.findall(".//v:rect", NS)
        vml_field = next((item for item in highlights if item[0] == item[1] == text_offset and item[3] not in rendered_controls), None)
        if vml_rects and vml_field:
            floating.append(self._vml_cell_control(vml_rects, vml_field[2], vml_field[3]))
            rendered_controls.add(vml_field[3])
        for start, end, label, field_id in highlights:
            if start == end == text_offset and field_id not in rendered_controls and not vml_rects:
                runs.append(self._form_control(label, field_id))
                rendered_controls.add(field_id)
        if floating:
            paragraph_style += ";position:relative"
        if not runs:
            empty_fields = [item for item in highlights if item[0] == item[1] == 0]
            runs.append(self._form_control(empty_fields[0][2], empty_fields[0][3]) if empty_fields else "&nbsp;")
        return f'<p class="docx-preview-paragraph" style="{paragraph_style}">{"".join(runs)}{"".join(floating)}</p>'

    def _paragraph_child(self, node: etree._Element, offset: int, highlights: list[tuple[int, int, str, str]], rendered_controls: set[str]) -> tuple[str, int, list[str]]:
        if node.tag == f"{{{W}}}r":
            pict = node.find(".//w:pict", NS)
            if pict is not None:
                textboxes = pict.findall(".//w:txbxContent", NS)
                overlays: list[str] = []
                content_length = 0
                for textbox in textboxes:
                    shape = pict.find(".//v:shape", {**NS, "v": "urn:schemas-microsoft-com:vml"})
                    shape_style = shape.get("style", "") if shape is not None else ""
                    style = self._vml_position_style(shape_style)
                    inner_parts: list[str] = []
                    inner_offset = offset + content_length
                    for inner_paragraph in textbox.findall("w:p", NS):
                        inner, inner_offset = self._textbox_paragraph(inner_paragraph, inner_offset, highlights, rendered_controls)
                        inner_parts.append(inner)
                    content_length += inner_offset - (offset + content_length)
                    overlays.append(f'<div class="docx-preview-floating" style="{style}">{"".join(inner_parts)}</div>')
                return "", offset + content_length, overlays
            rendered, next_offset = self._run_html(node, offset, highlights, rendered_controls)
            return rendered, next_offset, []
        if node.tag == f"{{{W}}}tab":
            return "&emsp;", offset + 1, []
        if node.tag in {f"{{{W}}}br", f"{{{W}}}cr"}:
            return "<br>", offset + 1, []
        rendered: list[str] = []
        overlays: list[str] = []
        for child in node:
            part, offset, child_overlays = self._paragraph_child(child, offset, highlights, rendered_controls)
            rendered.append(part)
            overlays.extend(child_overlays)
        return "".join(rendered), offset, overlays

    def _textbox_paragraph(self, paragraph: etree._Element, offset: int, highlights: list[tuple[int, int, str, str]], rendered_controls: set[str]) -> tuple[str, int]:
        alignment = paragraph.find("w:pPr/w:jc", NS)
        align = alignment.get(f"{{{W}}}val") if alignment is not None else "left"
        css_align = {"center": "center", "right": "right", "both": "justify"}.get(align or "", "left")
        parts: list[str] = []
        for run in paragraph.findall("w:r", NS):
            rendered, offset = self._run_html(run, offset, highlights, rendered_controls)
            parts.append(rendered)
        return f'<p class="docx-preview-paragraph" style="text-align:{css_align}">{"".join(parts)}</p>', offset

    def _vml_position_style(self, source: str) -> str:
        style = ["position:absolute", "z-index:2", "overflow:hidden"]
        for key in ("margin-left", "margin-top", "width", "height"):
            match = re.search(rf"(?:^|;){key}:\s*(-?[0-9.]+)(pt|px|in|cm)", source)
            if match:
                value, unit = match.groups()
                style.append(f"{key}:{value}{unit}")
        return ";".join(style)

    def _run_html(self, run: etree._Element, offset: int, highlights: list[tuple[int, int, str, str]], rendered_controls: set[str]) -> tuple[str, int]:
        properties = run.find("w:rPr", NS)
        bold = properties is not None and properties.find("w:b", NS) is not None
        italic = properties is not None and properties.find("w:i", NS) is not None
        underline = properties is not None and properties.find("w:u", NS) is not None
        styles = []
        if properties is not None:
            size = properties.find("w:sz", NS)
            color = properties.find("w:color", NS)
            if size is not None and size.get(f"{{{W}}}val"):
                styles.append(f"font-size:{int(size.get(f'{{{W}}}val')) / 2:g}pt")
            if color is not None and color.get(f"{{{W}}}val") not in (None, "auto"):
                styles.append(f"color:#{color.get(f'{{{W}}}val')}")
        values: list[str] = []
        for node in run.iter():
            if node.tag == f"{{{W}}}t":
                source = node.text or ""
                values.append(self._highlight_text(source, offset, highlights, rendered_controls))
                offset += len(source)
            elif node.tag == f"{{{W}}}tab":
                has_empty_field_here = any(start == end == offset and field_id in rendered_controls for start, end, _, field_id in highlights)
                if not has_empty_field_here:
                    values.append(self._highlight_text("\t", offset, highlights, rendered_controls))
                offset += 1
            elif node.tag in {f"{{{W}}}br", f"{{{W}}}cr"}:
                values.append("<br>")
                offset += 1
            elif node.tag == f"{{{W}}}sym":
                source = self._symbol_text(node)
                values.append(self._highlight_text(source, offset, highlights, rendered_controls))
                offset += len(source)
        content = "".join(values)
        if bold:
            content = f"<strong>{content}</strong>"
        if italic:
            content = f"<em>{content}</em>"
        if underline:
            content = f"<u>{content}</u>"
        if styles:
            content = f'<span style="{";".join(styles)}">{content}</span>'
        return content, offset

    def _highlight_text(self, text: str, offset: int, highlights: list[tuple[int, int, str, str]], rendered_controls: set[str]) -> str:
        parts: list[str] = []
        position = 0
        for start, end, label, field_id in sorted(highlights):
            if end <= offset or start >= offset + len(text):
                continue
            local_start = max(0, start - offset)
            local_end = min(len(text), end - offset)
            if local_start < position:
                continue
            parts.append(escape(text[position:local_start]))
            if field_id not in rendered_controls:
                source_fragment = text[local_start:local_end]
                if source_fragment in {"□", "☐", "☑", "☒", "▢", "■"} and end - start > 1:
                    parts.append(self._character_cell_control(label, field_id, end - start))
                elif source_fragment in {"□", "☐", "☑", "☒", "▢", "■"}:
                    parts.append(self._checkbox_control(label, field_id))
                else:
                    parts.append(self._form_control(label, field_id, source_length=end - start))
                rendered_controls.add(field_id)
            position = local_end
        parts.append(escape(text[position:]))
        return "".join(parts)

    def _form_control(self, label: str, field_id: str, *, source_length: int = 0) -> str:
        area = re.fullmatch(r"preview-area-(\d+)", field_id)
        if area:
            height = int(area.group(1)) * 38
            return (f'<textarea class="docx-form-field docx-form-field-area" data-field-id="{escape(field_id)}" '
                    f'aria-label="{escape(label)}" title="{escape(label)}" style="height:{height}px"></textarea>')
        if any(term in label.casefold() for term in ("nội dung", "mô tả", "lý do", "trình bày", "ý kiến")):
            return (f'<textarea class="docx-form-field docx-form-field-area" data-field-id="{escape(field_id)}" '
                    f'aria-label="{escape(label)}" title="{escape(label)}" style="height:120px"></textarea>')
        # Keep the source line's approximate width so the control reads like a
        # blank in the original document instead of repeating its label inside it.
        width = min(280, max(78, (source_length or len(label)) * 7))
        number_value = bool(re.search(r"(?:CMND|CCCD|định danh cá nhân|số điện thoại)", label, flags=re.IGNORECASE))
        classes = "docx-form-field"
        return (f'<input class="{classes}" type="text" data-field-id="{escape(field_id)}" '
                f'{"inputmode=\"numeric\" maxlength=\"12\" " if number_value else ""}'
                f'aria-label="{escape(label)}" title="{escape(label)}" style="width:{width}px">')

    def _checkbox_control(self, label: str, field_id: str) -> str:
        return (f'<input class="docx-form-checkbox" type="checkbox" data-field-id="{escape(field_id)}" '
                f'aria-label="{escape(label)}" title="{escape(label)}">')

    def _character_cell_control(self, label: str, field_id: str, count: int) -> str:
        width = min(560, max(110, count * 22))
        return (f'<input class="docx-form-field docx-form-field-character-cells" type="text" data-field-id="{escape(field_id)}" '
                f'maxlength="{count}" aria-label="{escape(label)}" title="{escape(label)}" '
                f'style="width:{width}px;--slot-width:22px">')

    def _vml_cell_control(self, shapes: list[etree._Element], label: str, field_id: str) -> str:
        def dimension(shape: etree._Element, key: str, fallback: float) -> float:
            match = re.search(rf"(?:^|;){key}:\s*(-?[0-9.]+)(pt|px|in|cm)", shape.get("style", ""))
            if not match:
                return fallback
            value, unit = match.groups()
            scale = {"pt": 1.0, "px": 0.75, "in": 72.0, "cm": 28.3465}[unit]
            return float(value) * scale

        lefts = [dimension(shape, "margin-left", 0) for shape in shapes]
        tops = [dimension(shape, "margin-top", 0) for shape in shapes]
        widths = [dimension(shape, "width", 24) for shape in shapes]
        heights = [dimension(shape, "height", 17.25) for shape in shapes]
        left, top = min(lefts), min(tops)
        right = max(x + width for x, width in zip(lefts, widths))
        bottom = max(y + height for y, height in zip(tops, heights))
        width, height = right - left, bottom - top
        style = f"position:absolute;z-index:3;left:{left:g}pt;top:{top:g}pt;width:{width:g}pt;height:{height:g}pt;--slot-width:{min(widths):g}pt"
        return (f'<input class="docx-form-field docx-form-field-number-cells" type="text" data-field-id="{escape(field_id)}" '
                f'inputmode="numeric" maxlength="{len(shapes)}" aria-label="{escape(label)}" title="{escape(label)}" '
                f'style="{style}">')

