from __future__ import annotations

from collections import defaultdict
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree

from app.modules.templates.schemas import (
    CandidateStatus,
    DetectionMethod,
    FieldCandidate,
    FillRequest,
    FormGeneration,
)
from app.modules.templates.services.docx_analyzer import NS, W


class DocxFillError(ValueError):
    pass


class DocxFiller:
    """Replaces accepted field source ranges while retaining surrounding Word runs."""

    def fill(self, source: bytes, generation: FormGeneration, request: FillRequest) -> bytes:
        accepted = [
            field for field in generation.candidates if field.status is CandidateStatus.ACCEPTED
        ]
        self._validate_values(accepted, request)
        try:
            with ZipFile(BytesIO(source)) as archive:
                parts = {name: archive.read(name) for name in archive.namelist()}
        except Exception as exc:
            raise DocxFillError("The original DOCX is unavailable or unreadable") from exc

        roots: dict[str, etree._Element] = {}
        for name, payload in parts.items():
            if (
                name == "word/document.xml"
                or (name.startswith("word/header") and name.endswith(".xml"))
                or (name.startswith("word/footer") and name.endswith(".xml"))
            ):
                roots[name] = etree.fromstring(payload)

        paragraphs = self._index_paragraphs(roots)
        replacements: dict[str, list[tuple[int, int, str]]] = defaultdict(list)
        for field in accepted:
            value = request.values.get(field.id, "")
            if DetectionMethod.CHECKBOX in field.methods:
                selected = value.strip().casefold() in {
                    "checked",
                    "true",
                    "yes",
                    "1",
                    "đã chọn",
                    "có",
                }
                value = "☒" if selected else "☐"
            for occurrence in field.occurrences:
                replacements[occurrence.block_id].append((occurrence.start, occurrence.end, value))

        for block_id, spans in replacements.items():
            paragraph = paragraphs.get(block_id)
            if paragraph is None:
                raise DocxFillError(
                    f"Field source {block_id} is no longer available in the template"
                )
            self._apply_replacements(paragraph, spans)

        for name, root in roots.items():
            parts[name] = etree.tostring(
                root, xml_declaration=True, encoding="UTF-8", standalone=True
            )
        return self._archive(parts)

    def output_filename(self, filename: str) -> str:
        return f"{Path(filename).stem or 'document'}-filled.docx"

    def _validate_values(self, fields: list[FieldCandidate], request: FillRequest) -> None:
        known = {field.id for field in fields}
        unexpected = set(request.values) - known
        if unexpected:
            raise DocxFillError("The request contains values for fields that are not accepted")
        missing = [
            field.label
            for field in fields
            if field.rules.required and not request.values.get(field.id, "").strip()
        ]
        if missing:
            raise DocxFillError(f"Required fields are missing: {', '.join(missing)}")

    def _index_paragraphs(self, roots: dict[str, etree._Element]) -> dict[str, etree._Element]:
        indexed: dict[str, etree._Element] = {}
        body_root = roots.get("word/document.xml")
        if body_root is not None:
            body = body_root.find("w:body", NS)
            if body is not None:
                self._index_container(body, "body", indexed)
        for name, root in roots.items():
            if name.startswith("word/header"):
                self._index_container(root, f"header:{name.rsplit('/', 1)[-1]}", indexed)
            elif name.startswith("word/footer"):
                self._index_container(root, f"footer:{name.rsplit('/', 1)[-1]}", indexed)
        return indexed

    def _index_container(
        self, container: etree._Element, path: str, indexed: dict[str, etree._Element]
    ) -> None:
        paragraph_index = 0
        table_index = 0
        for child in container:
            if child.tag == f"{{{W}}}p":
                indexed[f"{path}/p:{paragraph_index}"] = child
                paragraph_index += 1
            elif child.tag == f"{{{W}}}tbl":
                table_path = f"{path}/tbl:{table_index}"
                table_index += 1
                for row_index, row in enumerate(child.findall("w:tr", NS)):
                    for cell_index, cell in enumerate(row.findall("w:tc", NS)):
                        self._index_container(
                            cell, f"{table_path}/r:{row_index}/c:{cell_index}", indexed
                        )

    def _apply_replacements(
        self, paragraph: etree._Element, spans: list[tuple[int, int, str]]
    ) -> None:
        nodes, text_length = self._text_nodes(paragraph)
        if not nodes:
            if any(start != 0 or end != 0 for start, end, _ in spans):
                raise DocxFillError("The field range cannot be mapped to an empty Word paragraph")
            for _, _, value in spans:
                run = etree.SubElement(paragraph, f"{{{W}}}r")
                text = etree.SubElement(run, f"{{{W}}}t")
                text.text = value
            return
        prior_start = text_length + 1
        for start, end, value in sorted(spans, key=lambda span: span[0], reverse=True):
            if start < 0 or end < start or end > text_length or end > prior_start:
                raise DocxFillError(
                    "The field ranges overlap or no longer match the source document"
                )
            self._replace_range(nodes, start, end, value)
            prior_start = start

    def _text_nodes(
        self, paragraph: etree._Element
    ) -> tuple[list[tuple[etree._Element, int, int]], int]:
        nodes: list[tuple[etree._Element, int, int]] = []
        offset = 0
        for element in paragraph.iter():
            if element.tag == f"{{{W}}}t":
                text = element.text or ""
                nodes.append((element, offset, offset + len(text)))
                offset += len(text)
            elif element.tag == f"{{{W}}}sym":
                nodes.append((element, offset, offset + 1))
                offset += 1
            elif element.tag == f"{{{W}}}tab":
                offset += 1
            elif element.tag in {f"{{{W}}}br", f"{{{W}}}cr"}:
                offset += 1
        return nodes, offset

    def _replace_range(
        self, nodes: list[tuple[etree._Element, int, int]], start: int, end: int, value: str
    ) -> None:
        if start == end:
            for node, node_start, node_end in nodes:
                if node_start <= start <= node_end:
                    source = node.text or ""
                    offset = start - node_start
                    node.text = source[:offset] + value + source[offset:]
                    return
            raise DocxFillError("An empty field cannot be placed in this Word paragraph")
        touched = [
            (node, node_start, node_end)
            for node, node_start, node_end in nodes
            if node_start < end and node_end > start
        ]
        if not touched:
            previous = next(
                ((node, node_end) for node, _, node_end in reversed(nodes) if node_end <= start),
                None,
            )
            following = next(
                ((node, node_start) for node, node_start, _ in nodes if node_start >= end), None
            )
            if previous:
                node, _ = previous
                node.text = (node.text or "") + value
                return
            if following:
                node, _ = following
                node.text = value + (node.text or "")
                return
            raise DocxFillError("The field range cannot be mapped to Word text runs")
        first, first_start, _ = touched[0]
        last, _, last_end = touched[-1]
        first_text = first.text or ""
        last_text = last.text or ""
        prefix = first_text[: max(0, start - first_start)]
        suffix = (
            last_text[max(0, end - (last_end - len(last_text))) :]
            if last is not first
            else first_text[end - first_start :]
        )
        self._set_text(first, prefix + value + suffix if first is last else prefix + value)
        if first is not last:
            for node, _, _ in touched[1:-1]:
                self._set_text(node, "")
            self._set_text(last, suffix)

    def _set_text(self, node: etree._Element, value: str) -> None:
        if node.tag == f"{{{W}}}sym":
            node.tag = f"{{{W}}}t"
            node.attrib.clear()
        node.text = value

    def _archive(self, parts: dict[str, bytes]) -> bytes:
        stream = BytesIO()
        with ZipFile(stream, "w", ZIP_DEFLATED) as archive:
            for name, payload in parts.items():
                archive.writestr(name, payload)
        return stream.getvalue()
