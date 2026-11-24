from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
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


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("assignment_id", "id", name="uq_submissions_assignment_id_id"),
        ForeignKeyConstraint(
            ["assignment_id", "task_id", "submitted_by"],
            ["task_assignments.id", "task_assignments.task_id", "task_assignments.assignee_id"],
            ondelete="RESTRICT",
            name="fk_submissions_assignment_task_submitter",
        ),
        ForeignKeyConstraint(
            ["task_id", "template_id"],
            ["tasks.id", "tasks.template_id"],
            ondelete="RESTRICT",
            name="fk_submissions_task_template",
        ),
        CheckConstraint("source_draft_version >= 1", name="source_draft_version_positive"),
        Index("ix_submissions_task_id", "task_id"),
        Index("ix_submissions_submitted_by", "submitted_by"),
        Index("ix_submissions_template_id", "template_id"),
        Index(
            "ix_submissions_assignment_created_desc",
            "assignment_id",
            text("created_at DESC"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    public_code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    task_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    assignment_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    submitted_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    template_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    source_draft_version: Mapped[int] = mapped_column(Integer, nullable=False)
    field_values_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    verification_summary: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SubmissionReview(Base):
    __tablename__ = "submission_reviews"
    __table_args__ = (
        ForeignKeyConstraint(
            ["assignment_id", "submission_id"],
            ["submissions.assignment_id", "submissions.id"],
            ondelete="RESTRICT",
            name="fk_submission_reviews_assignment_submission",
        ),
        CheckConstraint(
            "decision IN ('approved', 'revision_requested')",
            name="decision_valid",
        ),
        Index("ix_submission_reviews_assignment_id", "assignment_id"),
        Index("ix_submission_reviews_reviewer_id", "reviewer_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    submission_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)
    assignment_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reviewer_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    decision: Mapped[str] = mapped_column(Text, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class FieldApplyLog(Base):
    __tablename__ = "field_apply_logs"
    __table_args__ = (
        CheckConstraint("apply_mode IN ('direct', 'combine', 'rewrite')", name="apply_mode_valid"),
        CheckConstraint(
            "parent_draft_version_after > parent_draft_version_before",
            name="version_increment_valid",
        ),
        Index("ix_field_apply_logs_target_template_field_id", "target_template_field_id"),
        Index("ix_field_apply_logs_applied_by", "applied_by"),
        Index(
            "ix_field_apply_logs_parent_draft_applied_desc",
            "parent_draft_id",
            text("applied_at DESC"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    parent_draft_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("document_drafts.id", ondelete="RESTRICT"), nullable=False
    )
    target_template_field_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("template_fields.id", ondelete="RESTRICT"), nullable=False
    )
    parent_draft_version_before: Mapped[int] = mapped_column(Integer, nullable=False)
    parent_draft_version_after: Mapped[int] = mapped_column(Integer, nullable=False)
    value_before: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    value_after: Mapped[Any] = mapped_column(JSONB, nullable=False)
    apply_mode: Mapped[str] = mapped_column(Text, nullable=False)
    applied_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class FieldApplySource(Base):
    __tablename__ = "field_apply_sources"
    __table_args__ = (Index("ix_field_apply_sources_source_submission_id", "source_submission_id"),)

    apply_log_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("field_apply_logs.id", ondelete="CASCADE"), primary_key=True
    )
    source_submission_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("submissions.id", ondelete="RESTRICT"), primary_key=True
    )


class TaskComment(Base):
    __tablename__ = "task_comments"
    __table_args__ = (
        Index("ix_task_comments_author_id", "author_id"),
        Index("ix_task_comments_task_created_asc", "task_id", text("created_at ASC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    task_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    mentions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ActivityEvent(Base):
    __tablename__ = "activity_events"
    __table_args__ = (
        Index("ix_activity_events_actor_id", "actor_id"),
        Index(
            "ix_activity_events_task_occurred_desc",
            "task_id",
            text("occurred_at DESC"),
        ),
        Index(
            "ix_activity_events_workspace_occurred_desc",
            "workspace_id",
            text("occurred_at DESC"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    workspace_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True
    )
    task_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True
    )
    actor_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
