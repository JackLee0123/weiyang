"""add announcements

Revision ID: h1a2b3c4d5e6
Revises: g1a2b3c4d5e6
Create Date: 2026-10-05
"""

from alembic import op
import sqlalchemy as sa


revision = "h1a2b3c4d5e6"
down_revision = "g1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "announcements" not in tables:
        op.create_table(
            "announcements",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("title", sa.String(length=120), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("level", sa.String(length=12), server_default="info", nullable=False),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            mysql_charset="utf8mb4",
        )

    if "announcement_reads" not in tables:
        op.create_table(
            "announcement_reads",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("announcement_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("read_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["announcement_id"], ["announcements.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("announcement_id", "user_id", name="uq_announcement_read"),
            mysql_charset="utf8mb4",
        )
        op.create_index("ix_announcement_reads_announcement_id", "announcement_reads", ["announcement_id"])
        op.create_index("ix_announcement_reads_user_id", "announcement_reads", ["user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "announcement_reads" in tables:
        op.drop_table("announcement_reads")
    if "announcements" in tables:
        op.drop_table("announcements")
