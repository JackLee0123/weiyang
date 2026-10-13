"""add schedule import batches

Revision ID: j3b4c5d6e7f8
Revises: i2b3c4d5e6f7
Create Date: 2026-10-13
"""

from alembic import op
import sqlalchemy as sa

revision = "j3b4c5d6e7f8"
down_revision = "i2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "schedule_import_batches",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("admin_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("date_start", sa.String(10), nullable=True),
        sa.Column("date_end", sa.String(10), nullable=True),
        sa.Column("rows_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("skipped_past", sa.Integer, nullable=False, server_default="0"),
        sa.Column("skipped_duplicate", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        mysql_charset="utf8mb4",
    )
    op.create_table(
        "schedule_import_items",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "batch_id",
            sa.Integer,
            sa.ForeignKey("schedule_import_batches.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_name", sa.String(80), nullable=False, server_default=""),
        sa.Column("plan_ids", sa.JSON, nullable=True),
        sa.Column("created", sa.Integer, nullable=False, server_default="0"),
        sa.Column("skipped_past", sa.Integer, nullable=False, server_default="0"),
        sa.Column("skipped_duplicate", sa.Integer, nullable=False, server_default="0"),
        sa.Column("cancelled_at", sa.DateTime, nullable=True),
        mysql_charset="utf8mb4",
    )


def downgrade() -> None:
    op.drop_table("schedule_import_items")
    op.drop_table("schedule_import_batches")
