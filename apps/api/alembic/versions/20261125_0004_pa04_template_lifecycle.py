"""Add publication time and choice options for PA04 templates."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20261125_0004"
down_revision = "20261125_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document_templates",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "template_fields",
        sa.Column(
            "choice_options",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.alter_column("template_fields", "choice_options", server_default=None)


def downgrade() -> None:
    op.drop_column("template_fields", "choice_options")
    op.drop_column("document_templates", "published_at")
