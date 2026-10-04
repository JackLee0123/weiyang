"""add source to records

Revision ID: g1a2b3c4d5e6
Revises: b1c2d3e4f5a6
Create Date: 2026-10-04
"""

from alembic import op
import sqlalchemy as sa


revision = "g1a2b3c4d5e6"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("records")}
    if "source" not in columns:
        op.add_column(
            "records",
            sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("records")}
    if "source" in columns:
        op.drop_column("records", "source")
