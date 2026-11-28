"""Server-side safety checks for reviewed Field Bindings (UC-A03, A2)."""

from __future__ import annotations

from itertools import combinations

from app.modules.templates.schemas import (
    CandidateStatus,
    DocumentBlock,
    FieldCandidate,
    SourceLocation,
)


class BindingError(ValueError):
    pass


def validate_accepted_bindings(
    blocks: list[DocumentBlock], candidates: list[FieldCandidate]
) -> None:
    """Reject accepted Bindings the renderer could not replace unambiguously.

    The review payload comes from the browser, so ranges are checked against the
    analyzed source blocks before they are persisted or published.
    """
    lengths = {block.id: len(block.text) for block in blocks}
    placed: dict[str, list[tuple[str, SourceLocation]]] = {}
    for candidate in candidates:
        if candidate.status is not CandidateStatus.ACCEPTED:
            continue
        for occurrence in candidate.occurrences:
            length = lengths.get(occurrence.block_id)
            if length is None or occurrence.end > length:
                raise BindingError(
                    f"Field '{candidate.label}' has a Binding outside the source document"
                )
            placed.setdefault(occurrence.block_id, []).append((candidate.label, occurrence))
    for spans in placed.values():
        for (first_label, first), (second_label, second) in combinations(spans, 2):
            if first.start == second.start or (
                first.start < second.end and second.start < first.end
            ):
                raise BindingError(
                    f"Bindings of '{first_label}' and '{second_label}' overlap the same text"
                )
