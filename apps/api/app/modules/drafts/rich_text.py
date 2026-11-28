from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


class RichTextError(ValueError):
    pass


@dataclass(frozen=True)
class RichTextRun:
    text: str
    bold: bool = False
    italic: bool = False


@dataclass(frozen=True)
class RichTextDocument:
    lines: tuple[tuple[RichTextRun, ...], ...]


MAX_RICH_TEXT_CHARS = 10_000


def validate_rich_text(value: str) -> RichTextDocument:
    """Accept only a small Tiptap-compatible JSON subset or plain text.

    The supported subset is paragraphs, bold/italic text, and one-level bullet
    or ordered lists. HTML, links, media, tables, and arbitrary nodes are
    rejected so the DOCX renderer never interprets untrusted markup.
    """
    if len(value) > MAX_RICH_TEXT_CHARS:
        raise RichTextError("Rich text exceeds the supported size limit")
    if value.lstrip().startswith("<"):
        raise RichTextError("HTML rich text is not supported")
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        if value.lstrip().startswith(("{", "[")):
            raise RichTextError("Rich text JSON is malformed") from None
        return plain_text_document(value)
    if not isinstance(parsed, dict):
        raise RichTextError("Rich text must be a Tiptap document object")
    if parsed.get("type") != "doc" or set(parsed) - {"type", "content"}:
        raise RichTextError("Rich text must use a Tiptap doc root")
    content = parsed.get("content", [])
    if not isinstance(content, list):
        raise RichTextError("Rich text document content must be a list")
    lines: list[tuple[RichTextRun, ...]] = []
    for block in content:
        if not isinstance(block, dict):
            raise RichTextError("Rich text blocks must be objects")
        block_type = block.get("type")
        if block_type == "paragraph":
            lines.append(parse_paragraph(block, prefix=""))
        elif block_type in {"bulletList", "orderedList"}:
            lines.extend(parse_list(block, ordered=block_type == "orderedList"))
        else:
            raise RichTextError(f"Unsupported rich text node: {block_type}")
    return RichTextDocument(lines=tuple(lines or [tuple()]))


def plain_text_document(value: str) -> RichTextDocument:
    return RichTextDocument(
        lines=tuple((RichTextRun(line),) for line in value.splitlines()) or (tuple(),)
    )


def parse_list(block: dict[str, Any], *, ordered: bool) -> list[tuple[RichTextRun, ...]]:
    allowed_keys = {"type", "content", "attrs"} if ordered else {"type", "content"}
    if set(block) - allowed_keys:
        raise RichTextError("Rich text lists cannot contain unsupported attributes")
    first_number = ordered_list_start(block.get("attrs")) if ordered else 1
    items = block.get("content")
    if not isinstance(items, list):
        raise RichTextError("Rich text list content must be a list")
    lines: list[tuple[RichTextRun, ...]] = []
    for index, item in enumerate(items, start=first_number):
        if not isinstance(item, dict) or item.get("type") != "listItem":
            raise RichTextError("Rich text lists may contain only listItem nodes")
        if set(item) - {"type", "content"}:
            raise RichTextError("Rich text list items cannot contain unsupported attributes")
        paragraphs = item.get("content")
        if not isinstance(paragraphs, list) or len(paragraphs) != 1:
            raise RichTextError("Rich text list items require exactly one paragraph")
        prefix = f"{index}. " if ordered else "• "
        lines.append(parse_paragraph(paragraphs[0], prefix=prefix))
    return lines


def ordered_list_start(attrs: object) -> int:
    """Tiptap always serializes ``{"start": n, "type": null}`` on ordered lists."""
    if attrs is None:
        return 1
    if not isinstance(attrs, dict) or set(attrs) - {"start", "type"} or attrs.get("type"):
        raise RichTextError("Rich text lists cannot contain unsupported attributes")
    start = attrs.get("start", 1)
    if not isinstance(start, int) or isinstance(start, bool) or not 1 <= start <= 9999:
        raise RichTextError("Rich text list numbering must start between 1 and 9999")
    return start


def parse_paragraph(block: dict[str, Any], *, prefix: str) -> tuple[RichTextRun, ...]:
    if not isinstance(block, dict) or block.get("type") != "paragraph":
        raise RichTextError("Rich text content must use paragraph nodes")
    if set(block) - {"type", "content"}:
        raise RichTextError("Rich text paragraphs cannot contain unsupported attributes")
    nodes = block.get("content", [])
    if not isinstance(nodes, list):
        raise RichTextError("Rich text paragraph content must be a list")
    runs: list[RichTextRun] = []
    for node in nodes:
        if not isinstance(node, dict) or node.get("type") != "text":
            node_type = node.get("type") if isinstance(node, dict) else type(node).__name__
            raise RichTextError(f"Unsupported rich text node: {node_type}")
        if set(node) - {"type", "text", "marks"}:
            raise RichTextError("Rich text text nodes cannot contain unsupported attributes")
        text = node.get("text")
        if not isinstance(text, str):
            raise RichTextError("Rich text text nodes require a string value")
        bold, italic = parse_marks(node.get("marks", []))
        runs.append(RichTextRun(text=text, bold=bold, italic=italic))
    if not runs:
        return (RichTextRun(prefix),) if prefix else tuple()
    if prefix:
        first = runs[0]
        runs[0] = RichTextRun(text=prefix + first.text, bold=first.bold, italic=first.italic)
    return tuple(runs)


def parse_marks(value: object) -> tuple[bool, bool]:
    if not isinstance(value, list):
        raise RichTextError("Rich text marks must be a list")
    marks: set[str] = set()
    for mark in value:
        if not isinstance(mark, dict) or set(mark) != {"type"}:
            raise RichTextError("Rich text marks may only contain a type")
        mark_type = mark.get("type")
        if mark_type not in {"bold", "italic"}:
            raise RichTextError(f"Unsupported rich text mark: {mark_type}")
        marks.add(mark_type)
    return "bold" in marks, "italic" in marks


def rich_text_to_word_runs(document: RichTextDocument) -> list[RichTextRun]:
    runs: list[RichTextRun] = []
    for line_index, line in enumerate(document.lines):
        if line_index > 0:
            if line:
                first = line[0]
                line = (RichTextRun("\n" + first.text, first.bold, first.italic), *line[1:])
            else:
                runs.append(RichTextRun("\n"))
                continue
        runs.extend(line)
    return runs


def rich_text_to_plain_text(document: RichTextDocument) -> str:
    return "\n".join("".join(run.text for run in line) for line in document.lines)
