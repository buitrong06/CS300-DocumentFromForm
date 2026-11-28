from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.contracts.templates import TemplateFieldType, TemplateSourceType
from app.core.models import DocumentTemplate, FileArtifact, TemplateField
from app.modules.templates.bindings import validate_accepted_bindings
from app.modules.templates.schemas import (
    CandidateStatus,
    FieldCandidate,
    FieldType,
    FormGeneration,
    GenerationPatch,
    utc_now,
)

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class RevisionConflict(Exception):
    pass


class FormGenerationStore:
    def __init__(self, db: Session, owner_id: int, storage_dir: Path) -> None:
        self.db = db
        self.owner_id = owner_id
        self.storage_dir = storage_dir

    def create(self, generation: FormGeneration, source: bytes) -> FormGeneration:
        return self.create_template(
            generation,
            source,
            source_type=TemplateSourceType.UPLOADED_DOCX,
        )

    def create_template(
        self,
        generation: FormGeneration,
        source: bytes,
        *,
        source_type: TemplateSourceType,
        preset_id: int | None = None,
        document_type_key: str | None = None,
        name: str | None = None,
        org_constants: Mapping[str, object] | None = None,
        version: int = 1,
    ) -> FormGeneration:
        """Persist a draft Template plus its source DOCX and candidate state."""
        storage_key = f"template-sources/{uuid4()}.docx"
        source_path = self.storage_dir / storage_key
        file_created = False
        write_finished = False
        try:
            with self.db.begin():
                artifact = FileArtifact(
                    storage_key=storage_key,
                    original_filename=generation.filename,
                    mime_type=DOCX_MEDIA_TYPE,
                    byte_size=len(source),
                    sha256=generation.sha256,
                    uploaded_by=self.owner_id,
                )
                self.db.add(artifact)
                self.db.flush()
                template = DocumentTemplate(
                    owner_id=self.owner_id,
                    slug=generation.id,
                    name=name or generation.filename,
                    version=version,
                    status="draft",
                    source_type=source_type,
                    preset_id=preset_id,
                    document_type_key=document_type_key,
                    source_artifact_id=artifact.id,
                    org_constants=dict(org_constants or {}),
                    created_at=generation.created_at,
                )
                self.db.add(template)
                self.db.flush()
                self._save_review(template, generation)
                self.db.flush()

                source_path.parent.mkdir(parents=True, exist_ok=True)
                with source_path.open("xb") as file:
                    file_created = True
                    file.write(source)
                write_finished = True
        except Exception as exc:
            # A lost connection at commit can leave a committed row. Retain its source file.
            commit_unknown = (
                write_finished and isinstance(exc, DBAPIError) and exc.connection_invalidated
            )
            if file_created and not commit_unknown:
                source_path.unlink(missing_ok=True)
            raise
        return generation

    def get(self, generation_id: str) -> FormGeneration | None:
        with self.db.begin():
            row = self._load(generation_id)
            return self._generation(*row) if row is not None else None

    def get_with_source(self, generation_id: str) -> tuple[FormGeneration, bytes] | None:
        with self.db.begin():
            row = self._load(generation_id)
            if row is None:
                return None
            template, artifact = row
            generation = self._generation(template, artifact)
            source_path = self.storage_dir / artifact.storage_key
        try:
            return generation, source_path.read_bytes()
        except FileNotFoundError:
            return None

    def update(self, generation_id: str, patch: GenerationPatch) -> FormGeneration | None:
        with self.db.begin():
            row = self._load(generation_id, for_update=True)
            if row is None:
                return None
            template, artifact = row
            generation = self._generation(template, artifact)
            if generation.revision != patch.revision:
                raise RevisionConflict
            validate_accepted_bindings(generation.blocks, patch.candidates)
            generation.candidates = patch.candidates
            generation.revision += 1
            has_proposals = any(
                candidate.status == CandidateStatus.PROPOSED for candidate in patch.candidates
            )
            generation.status = "needs_review" if has_proposals else "ready"
            generation.updated_at = utc_now()
            self._save_review(template, generation)
            return generation

    def _load(
        self, generation_id: str, *, for_update: bool = False
    ) -> tuple[DocumentTemplate, FileArtifact] | None:
        query = (
            select(DocumentTemplate, FileArtifact)
            .join(FileArtifact, DocumentTemplate.source_artifact_id == FileArtifact.id)
            .where(
                DocumentTemplate.owner_id == self.owner_id,
                DocumentTemplate.slug == generation_id,
                DocumentTemplate.version == 1,
                DocumentTemplate.status == "draft",
                DocumentTemplate.extraction_state.is_not(None),
            )
        )
        if for_update:
            query = query.with_for_update(of=DocumentTemplate)
        row = self.db.execute(query).one_or_none()
        if row is None:
            return None
        template, artifact = row
        return template, artifact

    @staticmethod
    def _generation(template: DocumentTemplate, artifact: FileArtifact) -> FormGeneration:
        return FormGeneration.model_validate({
            **(template.extraction_state or {}),
            "id": template.slug,
            "filename": artifact.original_filename,
            "sha256": artifact.sha256,
            "created_at": template.created_at,
        })

    def _save_review(self, template: DocumentTemplate, generation: FormGeneration) -> None:
        template.extraction_state = generation.model_dump(
            mode="json", exclude={"id", "filename", "sha256", "created_at"}
        )
        existing_fields = {
            field.field_key: field
            for field in self.db.scalars(
                select(TemplateField).where(TemplateField.template_id == template.id)
            )
        }
        accepted = [
            field for field in generation.candidates if field.status == CandidateStatus.ACCEPTED
        ]
        for display_order, candidate in enumerate(accepted):
            field = existing_fields.pop(candidate.id, None)
            if field is None:
                field = TemplateField(template_id=template.id, field_key=candidate.id)
                self.db.add(field)
            self._update_field(field, candidate, display_order)
        for field in existing_fields.values():
            self.db.delete(field)

    @staticmethod
    def _update_field(field: TemplateField, candidate: FieldCandidate, display_order: int) -> None:
        field.label = candidate.label
        field.field_type = (
            TemplateFieldType.AMOUNT_OF_MONEY
            if candidate.type == FieldType.MONEY
            else candidate.type
        )
        field.is_required = candidate.rules.required
        field.instructions = "\n".join(instruction.text for instruction in candidate.instructions)
        field.display_order = display_order
        field.bindings = [
            occurrence.model_dump(mode="json") for occurrence in candidate.occurrences
        ]
        field.choice_options = [option.model_dump(mode="json") for option in candidate.options]
        field.automatic_rules = [
            {"rule_type": rule_type, "value": value}
            for rule_type, value in candidate.rules.model_dump(
                mode="json", exclude={"required"}, exclude_none=True
            ).items()
        ]
