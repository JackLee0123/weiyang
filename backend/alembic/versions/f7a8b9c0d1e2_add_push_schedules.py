"""add push_schedules table

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-09-09
"""

from alembic import op
import sqlalchemy as sa


revision = "f7a8b9c0d1e2"
down_revision = "e6f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "push_schedules",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("recurrence", sa.String(length=12), nullable=False, server_default="daily"),
        sa.Column("times", sa.JSON(), nullable=True),
        sa.Column("days_of_week", sa.JSON(), nullable=True),
        sa.Column("day_of_month", sa.JSON(), nullable=True),
        sa.Column("month", sa.Integer(), nullable=True),
        sa.Column("day", sa.Integer(), nullable=True),
        sa.Column("batch_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_fired_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_push_schedules_user_id"),
    )
    op.create_index(op.f("ix_push_schedules_user_id"), "push_schedules", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_push_schedules_user_id"), table_name="push_schedules")
    op.drop_table("push_schedules")
