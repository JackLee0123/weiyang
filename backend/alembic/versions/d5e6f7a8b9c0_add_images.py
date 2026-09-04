"""add images to plans and records

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-09-05
"""

from alembic import op
import sqlalchemy as sa


revision = "d5e6f7a8b9c0"
down_revision = "c4d5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    plan_columns = {c["name"] for c in inspector.get_columns("plans")}
    if "images" not in plan_columns:
        op.add_column("plans", sa.Column("images", sa.JSON(), nullable=True))
    record_columns = {c["name"] for c in inspector.get_columns("records")}
    if "images" not in record_columns:
        op.add_column("records", sa.Column("images", sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    plan_columns = {c["name"] for c in inspector.get_columns("plans")}
    if "images" in plan_columns:
        op.drop_column("plans", "images")
    record_columns = {c["name"] for c in inspector.get_columns("records")}
    if "images" in record_columns:
        op.drop_column("records", "images")
