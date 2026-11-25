import sqlite3
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from pathlib import Path
from threading import Barrier

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.core.models import DocumentTemplate, FileArtifact, TemplateField, User
from app.modules.templates.import_legacy import import_generations
from app.modules.templates.schemas import CandidateStatus, FieldRules, GenerationPatch, Instruction
from app.modules.templates.services.docx_analyzer import DocxAnalyzer
from app.modules.templates.store import DOCX_MEDIA_TYPE, FormGenerationStore, RevisionConflict
from tests.templates.test_docx_analyzer import docx_with_body


def test_store_persists_canonical_template_fields_and_source(
    tmp_path: Path, owner: User, postgres_sessions: sessionmaker[Session]
) -> None:
    source = docx_with_body(
        "<w:p><w:r><w:t>{{Kinh phí}} {{Họ và tên}} {{Kinh phí}}</w:t></w:r></w:p>"
    )
    generation = DocxAnalyzer().analyze(source, "template.docx")
    with postgres_sessions() as db:
        FormGenerationStore(db, owner.id, tmp_path).create(generation, source)

    money, name = generation.candidates
    assert len(money.occurrences) == 2
    accepted = money.model_copy(update={
        "status": CandidateStatus.ACCEPTED,
        "rules": FieldRules(required=True, minimum=10),
        "instructions": [Instruction(text="Enter the amount")],
    })
    rejected = name.model_copy(update={"status": CandidateStatus.REJECTED})
    with postgres_sessions() as db:
        store = FormGenerationStore(db, owner.id, tmp_path)
        assert store.get_with_source(generation.id) == (generation, source)
        saved = store.update(
            generation.id, GenerationPatch(revision=1, candidates=[accepted, rejected])
        )
        assert saved is not None
        assert saved.revision == 2
        assert saved.status == "ready"
        with pytest.raises(RevisionConflict):
            store.update(generation.id, GenerationPatch(revision=1, candidates=[]))
        assert store.get(generation.id) == saved

    with postgres_sessions.begin() as db:
        templates = select(DocumentTemplate).where(DocumentTemplate.slug == generation.id)
        template = db.scalars(templates).one()
        assert template.owner_id == owner.id
        assert template.status == "draft"
        assert template.source_type == "uploaded_docx"
        assert template.version == 1
        artifact = db.get(FileArtifact, template.source_artifact_id)
        assert artifact is not None
        assert (artifact.sha256, artifact.byte_size) == (generation.sha256, len(source))
        assert (artifact.uploaded_by, artifact.mime_type) == (owner.id, DOCX_MEDIA_TYPE)
        assert (tmp_path / artifact.storage_key).read_bytes() == source
        fields = select(TemplateField).where(TemplateField.template_id == template.id)
        field = db.scalars(fields).one()
        field_id = field.id
        assert field.field_key == accepted.id
        assert field.field_type == "amount_of_money"
        assert field.is_required
        assert field.instructions == "Enter the amount"
        assert field.bindings == [occurrence.model_dump() for occurrence in accepted.occurrences]
        assert field.automatic_rules == [{"rule_type": "minimum", "value": 10}]

    with postgres_sessions() as db:
        store = FormGenerationStore(db, owner.id, tmp_path)
        renamed = accepted.model_copy(update={"label": "Total"})
        store.update(generation.id, GenerationPatch(revision=2, candidates=[renamed]))
        with db.begin():
            field = db.scalars(fields).one()
            assert (field.id, field.label) == (field_id, "Total")
        store.update(generation.id, GenerationPatch(revision=3, candidates=[]))
        with db.begin():
            assert db.scalars(fields).first() is None


def test_concurrent_updates_allow_only_one_save(
    tmp_path: Path, owner: User, postgres_sessions: sessionmaker[Session]
) -> None:
    source = docx_with_body("<w:p><w:r><w:t>{{Tên}}</w:t></w:r></w:p>")
    generation = DocxAnalyzer().analyze(source, "template.docx")
    with postgres_sessions() as db:
        FormGenerationStore(db, owner.id, tmp_path).create(generation, source)

    ready = Barrier(2)

    def update() -> int:
        ready.wait(timeout=5)
        with postgres_sessions() as db:
            store = FormGenerationStore(db, owner.id, tmp_path)
            try:
                saved = store.update(generation.id, GenerationPatch(revision=1, candidates=[]))
            except RevisionConflict:
                return 409
            assert saved is not None and saved.revision == 2
            return 200

    with ThreadPoolExecutor(max_workers=2) as executor:
        attempts = [executor.submit(update) for _ in range(2)]
        assert sorted(attempt.result(timeout=10) for attempt in attempts) == [200, 409]


def test_failed_file_write_rolls_back_metadata(
    tmp_path: Path, owner: User, postgres_sessions: sessionmaker[Session]
) -> None:
    (tmp_path / "template-sources").write_text("blocks creation of the storage directory")
    source = docx_with_body("<w:p><w:r><w:t>{{Tên}}</w:t></w:r></w:p>")
    generation = DocxAnalyzer().analyze(source, "template.docx")
    with postgres_sessions() as db:
        store = FormGenerationStore(db, owner.id, tmp_path)
        with pytest.raises(FileExistsError):
            store.create(generation, source)
        assert store.get(generation.id) is None
        with db.begin():
            artifacts = select(FileArtifact).where(FileArtifact.uploaded_by == owner.id)
            assert db.scalar(artifacts) is None


def test_import_legacy_sqlite_is_read_only_and_keeps_existing_ids(
    tmp_path: Path, owner: User, postgres_sessions: sessionmaker[Session]
) -> None:
    source = docx_with_body("<w:p><w:r><w:t>{{Tên}}</w:t></w:r></w:p>")
    generation = DocxAnalyzer().analyze(source, "template.docx")
    missing_source = DocxAnalyzer().analyze(source, "missing.docx")
    sqlite_path = tmp_path / "form-generations.sqlite3"
    with closing(sqlite3.connect(sqlite_path)) as legacy, legacy:
        legacy.execute(
            "CREATE TABLE form_generations (id TEXT PRIMARY KEY, payload TEXT, source BLOB)"
        )
        legacy.executemany(
            "INSERT INTO form_generations VALUES (?, ?, ?)",
            [
                (generation.id, generation.model_dump_json(), source),
                (missing_source.id, missing_source.model_dump_json(), None),
            ],
        )
    original = sqlite_path.read_bytes()

    with postgres_sessions() as db:
        store = FormGenerationStore(db, owner.id, tmp_path)
        assert import_generations(sqlite_path, store) == (1, 0, 1)
        assert import_generations(sqlite_path, store) == (0, 1, 1)
        assert store.get_with_source(generation.id) == (generation, source)
        assert sqlite_path.read_bytes() == original
