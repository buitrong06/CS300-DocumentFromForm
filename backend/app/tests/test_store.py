from pathlib import Path

import pytest

from app.models import CandidateStatus, GenerationPatch
from app.services.docx_analyzer import DocxAnalyzer
from app.store import FormGenerationStore, RevisionConflict
from app.tests.test_docx_analyzer import docx_with_body


def test_store_uses_optimistic_revisions(tmp_path: Path) -> None:
    store = FormGenerationStore(tmp_path / "forms.sqlite3")
    generation = DocxAnalyzer().analyze(
        docx_with_body("<w:p><w:r><w:t>Tên: {{Họ và tên}}</w:t></w:r></w:p>"),
        "template.docx",
    )
    store.create(generation)
    candidate = generation.candidates[0].model_copy(update={"status": CandidateStatus.ACCEPTED})
    saved = store.update(generation.id, GenerationPatch(revision=1, candidates=[candidate]))
    assert saved is not None
    assert saved.revision == 2
    assert saved.status == "ready"
    with pytest.raises(RevisionConflict):
        store.update(generation.id, GenerationPatch(revision=1, candidates=[candidate]))
