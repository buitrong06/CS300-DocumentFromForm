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
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class DocumentDraft(Base):
    __tablename__ = "document_drafts"
    __table_args__ = (
        CheckConstraint("version >= 1", name="version_positive"),
        Index("ix_document_drafts_template_id", "template_id"),
        Index("ix_document_drafts_owner_id", "owner_id"),
        Index(
            "ix_document_drafts_personal_active",
            "owner_id",
            text("updated_at DESC"),
            postgresql_where=text("is_personal = true AND deleted_at IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    template_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("document_templates.id", ondelete="RESTRICT"), nullable=False
    )
    owner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    is_personal: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    field_values: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    last_check_result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class RenderSnapshot(Base):
    __tablename__ = "render_snapshots"
    __table_args__ = (
        CheckConstraint("format IN ('docx', 'pdf')", name="format_valid"),
        CheckConstraint(
            "purpose IN ('preview', 'draft_export', 'final_export')",
            name="purpose_valid",
        ),
        CheckConstraint(
            "(draft_id IS NOT NULL AND submission_id IS NULL "
            "AND source_draft_version IS NOT NULL AND source_draft_version >= 1) OR "
            "(submission_id IS NOT NULL AND draft_id IS NULL AND source_draft_version IS NULL)",
            name="exactly_one_source",
        ),
        Index("ix_render_snapshots_draft_id", "draft_id"),
        Index("ix_render_snapshots_submission_id", "submission_id"),
        Index("ix_render_snapshots_artifact_id", "artifact_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    draft_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("document_drafts.id", ondelete="CASCADE"), nullable=True
    )
    submission_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("submissions.id", ondelete="RESTRICT"), nullable=True
    )
    source_draft_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    format: Mapped[str] = mapped_column(Text, nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    artifact_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("file_artifacts.id", ondelete="RESTRICT"), nullable=False
    )
    rendered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
