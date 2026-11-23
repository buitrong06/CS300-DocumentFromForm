from __future__ import annotations

from sqlalchemy.schema import CreateTable

import app.core.models  # noqa: F401
from app.core.db import Base, engine
from app.core.seed import PRESET_EXAMPLE_PATH, load_preset_example_yaml

EXPECTED_TABLES: set[str] = {
    # Sub-domain 1: Identity, Workspaces & File Artifacts
    "users",
    "workspaces",
    "workspace_members",
    "file_artifacts",
    # Sub-domain 2: Presets, Templates & Fields
    "formatting_presets",
    "document_templates",
    "template_fields",
    # Sub-domain 3: Document Drafts & Render Snapshots
    "document_drafts",
    "render_snapshots",
    # Sub-domain 4: Tasks, Scopes & Assignments
    "tasks",
    "task_field_scopes",
    "task_assignments",
    # Sub-domain 5: Submissions, Reviews, Apply Provenance & Discussions
    "submissions",
    "submission_reviews",
    "field_apply_logs",
    "field_apply_sources",
    "task_comments",
    "activity_events",
}


def test_all_18_tables_registered_in_metadata() -> None:
    registered_tables = set(Base.metadata.tables.keys())
    assert registered_tables == EXPECTED_TABLES
    assert len(registered_tables) == 18
    # DEC-015: document_templates is user-owned (owner_id) and decoupled from workspace_id
    assert "workspace_id" not in Base.metadata.tables["document_templates"].columns


def test_composite_foreign_keys_and_invariants_present() -> None:
    tables = Base.metadata.tables

    # 1. task_field_scopes must enforce composite FKs to tasks(id, template_id)
    #    and template_fields(template_id, id)
    scope_table = tables["task_field_scopes"]
    scope_fk_targets = {
        tuple(sorted(fk.target_fullname for fk in constraint.elements))
        for constraint in scope_table.foreign_key_constraints
    }
    assert ("tasks.id", "tasks.template_id") in scope_fk_targets
    assert ("template_fields.id", "template_fields.template_id") in scope_fk_targets

    # 2. submissions must enforce composite FKs to task_assignments(id, task_id, assignee_id)
    #    and tasks(id, template_id), and have no mutable updated_at column
    submissions_table = tables["submissions"]
    assert "updated_at" not in submissions_table.columns
    sub_fk_targets = {
        tuple(sorted(fk.target_fullname for fk in constraint.elements))
        for constraint in submissions_table.foreign_key_constraints
    }
    assert (
        "task_assignments.assignee_id",
        "task_assignments.id",
        "task_assignments.task_id",
    ) in sub_fk_targets
    assert ("tasks.id", "tasks.template_id") in sub_fk_targets

    # 3. submission_reviews must enforce 1:1 unique submission_id and composite FK
    reviews_table = tables["submission_reviews"]
    assert reviews_table.columns["submission_id"].unique is True
    review_fk_targets = {
        tuple(sorted(fk.target_fullname for fk in constraint.elements))
        for constraint in reviews_table.foreign_key_constraints
    }
    assert ("submissions.assignment_id", "submissions.id") in review_fk_targets

    # 4. DEC-018: task_comments uses mentions JSONB instead of single submission_id
    comments_table = tables["task_comments"]
    assert "mentions" in comments_table.columns
    assert "submission_id" not in comments_table.columns


def test_postgresql_ddl_compiles_for_all_18_tables() -> None:
    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=engine.dialect))
        assert f"CREATE TABLE {table.name}" in ddl


def test_preset_example_yaml_loads_all_six_blocks() -> None:
    assert PRESET_EXAMPLE_PATH.exists()
    data = load_preset_example_yaml()
    for required_block in ("meta", "core", "advanced", "document_types", "unruled", "evidence"):
        assert required_block in data
    assert data["meta"]["id"] == "nd30-2020"
