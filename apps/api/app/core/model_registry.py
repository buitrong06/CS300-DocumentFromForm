"""Alembic model registry.

Feature modules keep models in their own packages and register them here so
autogenerate sees one complete modular-monolith metadata graph.
"""

from app.core.models import (
    ActivityEvent,
    Base,
    DocumentDraft,
    DocumentTemplate,
    FieldApplyLog,
    FieldApplySource,
    FileArtifact,
    FormattingPreset,
    RenderSnapshot,
    Submission,
    SubmissionReview,
    Task,
    TaskAssignment,
    TaskComment,
    TaskFieldScope,
    TemplateField,
    User,
    Workspace,
    WorkspaceMember,
)

__all__ = [
    "ActivityEvent",
    "Base",
    "DocumentDraft",
    "DocumentTemplate",
    "FieldApplyLog",
    "FieldApplySource",
    "FileArtifact",
    "FormattingPreset",
    "RenderSnapshot",
    "Submission",
    "SubmissionReview",
    "Task",
    "TaskAssignment",
    "TaskComment",
    "TaskFieldScope",
    "TemplateField",
    "User",
    "Workspace",
    "WorkspaceMember",
]
