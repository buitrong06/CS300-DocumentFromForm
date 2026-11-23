from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class FormattingPreset(Base):
    __tablename__ = "formatting_presets"
    __table_args__ = (
        UniqueConstraint("slug", "version", name="uq_formatting_presets_slug_version"),
        CheckConstraint("version >= 1", name="version_positive"),
        CheckConstraint("status IN ('reviewing', 'published')", name="status_valid"),
        Index("ix_formatting_presets_parent_preset_id", "parent_preset_id"),
        Index("ix_formatting_presets_source_artifact_id", "source_artifact_id"),
        Index("ix_formatting_presets_created_by", "created_by"),
        Index("ix_formatting_presets_status_builtin", "status", "is_builtin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    is_builtin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    parent_preset_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("formatting_presets.id", ondelete="RESTRICT"), nullable=True
    )
    source_artifact_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("file_artifacts.id", ondelete="RESTRICT"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="reviewing", server_default=text("'reviewing'")
    )
    core: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    advanced: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    document_types: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    unruled: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    evidence: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    created_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class DocumentTemplate(Base):
    __tablename__ = "document_templates"
    __table_args__ = (
        UniqueConstraint("slug", "version", name="uq_document_templates_slug_version"),
        CheckConstraint("version >= 1", name="version_positive"),
        CheckConstraint("status IN ('draft', 'published', 'archived')", name="status_valid"),
        CheckConstraint("source_type IN ('preset', 'uploaded_docx')", name="source_type_valid"),
        CheckConstraint(
            "(source_type = 'preset' AND preset_id IS NOT NULL) OR "
            "(source_type = 'uploaded_docx' AND source_artifact_id IS NOT NULL)",
            name="source_reference_consistent",
        ),
        Index("ix_document_templates_owner_status", "owner_id", "status"),
        Index("ix_document_templates_preset_id", "preset_id"),
        Index("ix_document_templates_source_artifact_id", "source_artifact_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="draft", server_default=text("'draft'")
    )
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    preset_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("formatting_presets.id", ondelete="RESTRICT"), nullable=True
    )
    document_type_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_artifact_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("file_artifacts.id", ondelete="RESTRICT"), nullable=True
    )
    org_constants: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    locked_segments: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    checklist_approved: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class TemplateField(Base):
    __tablename__ = "template_fields"
    __table_args__ = (
        UniqueConstraint("template_id", "field_key", name="uq_template_fields_template_key"),
        UniqueConstraint("template_id", "id", name="uq_template_fields_template_id"),
        CheckConstraint(
            "field_type IN ('short_text', 'long_text', 'date', "
            "'number', 'amount_of_money', 'choice')",
            name="field_type_valid",
        ),
        Index("ix_template_fields_template_display_order", "template_id", "display_order"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    template_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("document_templates.id", ondelete="CASCADE"), nullable=False
    )
    field_key: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    field_type: Mapped[str] = mapped_column(
        Text, nullable=False, default="short_text", server_default=text("'short_text'")
    )
    is_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    bindings: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    automatic_rules: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    semantic_criteria: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
