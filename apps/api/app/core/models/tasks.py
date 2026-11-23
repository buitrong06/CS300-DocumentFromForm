from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Identity,
    Index,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        UniqueConstraint("id", "template_id", name="uq_tasks_id_template_id"),
        CheckConstraint("status IN ('active', 'cancelled')", name="status_valid"),
        Index("ix_tasks_assigner_id", "assigner_id"),
        Index("ix_tasks_template_id", "template_id"),
        Index("ix_tasks_workspace_status_due_at", "workspace_id", "status", "due_at"),
        Index(
            "ix_tasks_parent_assignment_id",
            "parent_assignment_id",
            postgresql_where=text("parent_assignment_id IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    workspace_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("workspaces.id", ondelete="RESTRICT"), nullable=False
    )
    assigner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    template_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("document_templates.id", ondelete="RESTRICT"), nullable=False
    )
    parent_assignment_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(
            "task_assignments.id",
            ondelete="RESTRICT",
            use_alter=True,
            name="fk_tasks_parent_assignment_id_task_assignments",
        ),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="active", server_default=text("'active'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class TaskFieldScope(Base):
    __tablename__ = "task_field_scopes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["task_id", "template_id"],
            ["tasks.id", "tasks.template_id"],
            ondelete="CASCADE",
            name="fk_task_field_scopes_task_template",
        ),
        ForeignKeyConstraint(
            ["template_id", "template_field_id"],
            ["template_fields.template_id", "template_fields.id"],
            ondelete="CASCADE",
            name="fk_task_field_scopes_template_field",
        ),
        CheckConstraint("access_mode IN ('editable', 'readonly')", name="access_mode_valid"),
        Index("ix_task_field_scopes_template_id", "template_id"),
        Index("ix_task_field_scopes_template_field_id", "template_field_id"),
    )

    task_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    template_field_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    template_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    access_mode: Mapped[str] = mapped_column(
        Text, nullable=False, default="editable", server_default=text("'editable'")
    )


class TaskAssignment(Base):
    __tablename__ = "task_assignments"
    __table_args__ = (
        UniqueConstraint("task_id", "assignee_id", name="uq_task_assignments_task_assignee"),
        UniqueConstraint(
            "id", "task_id", "assignee_id", name="uq_task_assignments_id_task_assignee"
        ),
        ForeignKeyConstraint(
            ["id", "latest_submission_id"],
            ["submissions.assignment_id", "submissions.id"],
            ondelete="RESTRICT",
            use_alter=True,
            name="fk_task_assignments_latest_submission",
        ),
        CheckConstraint(
            "status IN ('assigned', 'in_progress', 'submitted', "
            "'approved', 'revision_needed', 'cancelled')",
            name="status_valid",
        ),
        Index("ix_task_assignments_latest_submission_id", "latest_submission_id"),
        Index(
            "ix_task_assignments_assignee_status_updated",
            "assignee_id",
            "status",
            text("updated_at DESC"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    task_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("tasks.id", ondelete="RESTRICT"), nullable=False
    )
    assignee_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    draft_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("document_drafts.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    latest_submission_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="assigned", server_default=text("'assigned'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
