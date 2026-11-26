from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts.templates import TemplateSourceType
from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.models import (
    DocumentDraft,
    DocumentTemplate,
    FileArtifact,
    FormattingPreset,
    TemplateField,
    User,
    Workspace,
    WorkspaceMember,
)
from app.modules.templates.lifecycle import (
    apply_preset_field_defaults,
    build_supported_preset_docx,
    publish_template,
)
from app.modules.templates.schemas import CandidateStatus
from app.modules.templates.services.docx_analyzer import DocxAnalyzer
from app.modules.templates.store import FormGenerationStore

REPO_ROOT = Path(__file__).resolve().parents[4]
PRESET_EXAMPLE_PATH = REPO_ROOT / "docs" / "analysis-and-design" / "preset_example.yaml"
SEED_TEMPLATE_FIELD_KEYS = frozenset(
    {"trich_yeu", "kinh_gui", "noi_dung_de_xuat", "kinh_phi_du_kien"}
)
SEED_TEMPLATE_ORG_CONSTANTS = {
    "governing_org": "ĐẠI HỌC QUỐC GIA TP. HCM",
    "issuing_org": "TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN",
}


def load_preset_example_yaml(path: Path = PRESET_EXAMPLE_PATH) -> dict[str, Any]:
    """Load and parse the canonical Decree 30/2020 YAML preset specification."""
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"Expected a YAML mapping in {path}")
    return data


def is_renderable_seed_template(
    session: Session, template: DocumentTemplate, storage_dir: Path
) -> bool:
    """Only reuse the baseline Template when its PA04 render contract remains intact."""
    if (
        template.status != "published"
        or template.document_type_key != "to_trinh"
        or template.source_artifact_id is None
    ):
        return False
    artifact = session.get(FileArtifact, template.source_artifact_id)
    if artifact is None or not (storage_dir / artifact.storage_key).is_file():
        return False
    field_keys = set(
        session.scalars(
            select(TemplateField.field_key).where(TemplateField.template_id == template.id)
        )
    )
    return field_keys == SEED_TEMPLATE_FIELD_KEYS


def seed_baseline_data(session: Session) -> dict[str, int]:
    """Idempotently seed Week 0 baseline user, workspace, ND30 preset, template, and draft."""
    settings = get_settings()

    # 1. Dev User (matches AUTH_DEV_BYPASS user identity)
    user = session.scalar(select(User).where(User.email == settings.auth_dev_user_email))
    if user is None:
        user = User(
            firebase_uid="dev-user-001",
            email=settings.auth_dev_user_email,
            display_name="Dev User",
            is_active=True,
        )
        session.add(user)
        session.flush()

    # 2. Default Workspace & Admin Membership
    workspace = session.scalar(select(Workspace).where(Workspace.slug == "hcmus-admin"))
    if workspace is None:
        workspace = Workspace(
            slug="hcmus-admin",
            name="HCMUS Administrative Workspace",
            created_by=user.id,
        )
        session.add(workspace)
        session.flush()

    membership = session.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == user.id,
        )
    )
    if membership is None:
        membership = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user.id,
            role="admin",
            can_assign=True,
        )
        session.add(membership)
        session.flush()

    # 3. Built-in Decree 30/2020 Formatting Preset from preset_example.yaml
    preset_yaml = load_preset_example_yaml()
    meta = preset_yaml.get("meta", {})
    preset_slug = str(meta.get("id", "nd30-2020"))
    preset_version = int(meta.get("version", 1))
    preset_name = str(meta.get("name", "Hành chính nhà nước — Nghị định 30/2020/NĐ-CP"))

    preset = session.scalar(
        select(FormattingPreset).where(
            FormattingPreset.slug == preset_slug,
            FormattingPreset.version == preset_version,
        )
    )
    if preset is None:
        preset = FormattingPreset(
            slug=preset_slug,
            version=preset_version,
            name=preset_name,
            is_builtin=bool(meta.get("is_builtin", True)),
            status=str(meta.get("status", "published")),
            core=dict(preset_yaml.get("core", {})),
            advanced=dict(preset_yaml.get("advanced", {})),
            document_types=dict(preset_yaml.get("document_types", {})),
            unruled=dict(preset_yaml.get("unruled", {})),
            evidence=dict(preset_yaml.get("evidence", {})),
            created_by=user.id,
        )
        session.add(preset)
        session.flush()

    # 4. Golden-Path PA04 Template.  Existing pre-PA04 fixture versions remain
    # immutable; if they lack a source artifact, seed a corrected next version.
    template_slug = "to-trinh-nd30-sample"
    template = session.scalar(
        select(DocumentTemplate).where(
            DocumentTemplate.slug == template_slug,
        ).order_by(DocumentTemplate.version.desc())
    )
    storage_dir = Path(settings.storage_local_dir)
    if template is None or not is_renderable_seed_template(session, template, storage_dir):
        next_version = 1 if template is None else template.version + 1
        # FormGenerationStore owns the source artifact and its cleanup path, so
        # commit the foundational rows before entering its transaction boundary.
        session.commit()
        source = build_supported_preset_docx(
            "to_trinh",
            SEED_TEMPLATE_ORG_CONSTANTS,
            core=preset.core,
            advanced=preset.advanced,
        )
        generation = apply_preset_field_defaults(
            DocxAnalyzer().analyze(source, "to-trinh-nd30-sample.docx"), "to_trinh"
        )
        generation.id = template_slug
        generation.status = "ready"
        for candidate in generation.candidates:
            candidate.status = CandidateStatus.ACCEPTED
        FormGenerationStore(session, user.id, storage_dir).create_template(
            generation,
            source,
            source_type=TemplateSourceType.PRESET,
            preset_id=preset.id,
            document_type_key="to_trinh",
            name="Mẫu Tờ trình hành chính (Nghị định 30/2020)",
            org_constants=SEED_TEMPLATE_ORG_CONSTANTS,
            version=next_version,
        )
        template = session.scalar(
            select(DocumentTemplate).where(
                DocumentTemplate.slug == template_slug,
                DocumentTemplate.version == next_version,
            )
        )
        if template is None:
            raise RuntimeError("The PA04 seed Template was not persisted")
        template_id = template.id
        session.commit()
        if publish_template(session, user.id, template_id) is None:
            raise RuntimeError("The PA04 seed Template could not be published")
        template = session.get(DocumentTemplate, template_id)
        if template is None:
            raise RuntimeError("The published PA04 seed Template was not found")

    # 5. Sample Personal DocumentDraft for Golden Path
    draft = session.scalar(
        select(DocumentDraft).where(
            DocumentDraft.owner_id == user.id,
            DocumentDraft.template_id == template.id,
            DocumentDraft.is_personal.is_(True),
        )
    )
    if draft is None:
        draft = DocumentDraft(
            template_id=template.id,
            owner_id=user.id,
            title="Tờ trình đề xuất kế hoạch hoạt động học kỳ 1",
            is_personal=True,
            field_values={
                "trich_yeu": "Về việc phê duyệt kế hoạch hoạt động học thuật học kỳ 1",
                "noi_dung_de_xuat": "",
                "kinh_phi_du_kien": "5000000",
            },
            version=1,
        )
        session.add(draft)
        session.flush()

    session.commit()
    return {
        "user_id": user.id,
        "workspace_id": workspace.id,
        "preset_id": preset.id,
        "template_id": template.id,
        "draft_id": draft.id,
    }


def main() -> None:
    with SessionLocal() as session:
        ids = seed_baseline_data(session)
        print("Seeded baseline Week 0 records:", ids)


if __name__ == "__main__":
    main()
