"""Alembic model registry.

Feature modules keep models in their own packages and register them here so
autogenerate sees one complete modular-monolith metadata graph.
"""

from app.core.models import Base, FileArtifact, User, Workspace, WorkspaceMember

__all__ = ["Base", "FileArtifact", "User", "Workspace", "WorkspaceMember"]
