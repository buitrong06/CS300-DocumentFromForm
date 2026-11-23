from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.models import (
    DocumentDraft,
    DocumentTemplate,
    FormattingPreset,
    TemplateField,
    User,
    Workspace,
    WorkspaceMember,
)

REPO_ROOT = Path(__file__).resolve().parents[4]
PRESET_EXAMPLE_PATH = REPO_ROOT / "docs" / "analysis-and-design" / "preset_example.yaml"


def load_preset_example_yaml(path: Path = PRESET_EXAMPLE_PATH) -> dict[str, Any]:
    """Load and parse the canonical Decree 30/2020 YAML preset specification."""
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"Expected a YAML mapping in {path}")
    return data


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

    # 4. Golden-Path Sample DocumentTemplate & TemplateFields
    template_slug = "to-trinh-nd30-sample"
    template = session.scalar(
        select(DocumentTemplate).where(
            DocumentTemplate.slug == template_slug,
            DocumentTemplate.version == 1,
        )
    )
    if template is None:
        template = DocumentTemplate(
            owner_id=user.id,
            slug=template_slug,
            name="Mẫu Tờ trình hành chính (Nghị định 30/2020)",
            version=1,
            status="published",
            source_type="preset",
            preset_id=preset.id,
            document_type_key="cong_van",
            org_constants={
                "governing_org": "ĐẠI HỌC QUỐC GIA TP. HCM",
                "issuing_org": "TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN",
            },
            locked_segments=[],
            checklist_approved=True,
        )
        session.add(template)
        session.flush()

        sample_fields = [
            TemplateField(
                template_id=template.id,
                field_key="trich_yeu",
                label="Trích yếu nội dung",
                field_type="short_text",
                is_required=True,
                instructions="Nêu ngắn gọn chủ đề tờ trình (tối thiểu 10 ký tự).",
                display_order=1,
                bindings=[{"marker": "{{trich_yeu}}"}],
                automatic_rules=[{"rule_type": "min_length", "value": 10}],
                semantic_criteria=[],
            ),
            TemplateField(
                template_id=template.id,
                field_key="noi_dung_de_xuat",
                label="Nội dung đề xuất",
                field_type="long_text",
                is_required=True,
                instructions="Trình bày căn cứ, mục đích và phương án đề xuất cụ thể.",
                display_order=2,
                bindings=[{"marker": "{{noi_dung_de_xuat}}"}],
                automatic_rules=[{"rule_type": "min_length", "value": 20}],
                semantic_criteria=[
                    {"id": "sem_1", "description": "Nêu rõ căn cứ thực hiện và đề xuất cụ thể."}
                ],
            ),
            TemplateField(
                template_id=template.id,
                field_key="kinh_phi_du_kien",
                label="Kinh phí dự kiến",
                field_type="amount_of_money",
                is_required=False,
                instructions="Nhập tổng kinh phí dự kiến (VNĐ) nếu có.",
                display_order=3,
                bindings=[{"marker": "{{kinh_phi_du_kien}}"}],
                automatic_rules=[],
                semantic_criteria=[],
            ),
        ]
        session.add_all(sample_fields)
        session.flush()

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
