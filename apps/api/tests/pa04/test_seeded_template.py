from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.core.models import DocumentDraft, DocumentTemplate, FileArtifact, TemplateField
from app.core.seed import seed_baseline_data
from app.modules.templates.lifecycle import generation_from_template


def test_seeded_preset_template_has_a_renderable_source_and_field_contract(
    monkeypatch: Any, postgres_sessions: sessionmaker[Session], tmp_path: Path
) -> None:
    storage_dir = tmp_path / "storage"
    settings = Settings(
        auth_dev_bypass=False,
        storage_local_dir=str(storage_dir),
        render_work_dir=str(tmp_path / "render"),
    )
    monkeypatch.setattr("app.core.seed.get_settings", lambda: settings)

    with postgres_sessions() as db:
        ids = seed_baseline_data(db)
        template = db.get(DocumentTemplate, ids["template_id"])
        draft = db.get(DocumentDraft, ids["draft_id"])
        assert template is not None
        assert draft is not None
        assert template.document_type_key == "to_trinh"
        assert template.source_artifact_id is not None
        artifact = db.get(FileArtifact, template.source_artifact_id)
        assert artifact is not None
        assert (storage_dir / artifact.storage_key).read_bytes().startswith(b"PK")
        generation = generation_from_template(template, artifact)
        assert generation is not None
        fields = list(db.query(TemplateField).filter(TemplateField.template_id == template.id))
        assert {field.field_key for field in fields} == {
            candidate.id for candidate in generation.candidates
        }
        assert set(draft.field_values) <= {field.field_key for field in fields}

        rerun_ids = seed_baseline_data(db)
        assert rerun_ids["template_id"] == template.id
