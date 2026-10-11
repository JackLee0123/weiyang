"""add obsidian notes & sync settings

Revision ID: i2b3c4d5e6f7
Revises: h1a2b3c4d5e6
Create Date: 2026-10-08
"""

from alembic import op
import sqlalchemy as sa

revision = "i2b3c4d5e6f7"
down_revision = "h1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "obsidian_notes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("path", sa.String(512), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content_md", sa.Text, nullable=False),
        sa.Column("content_html", sa.Text, nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("deleted", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("user_id", "path", name="uq_obsidian_note_user_path"),
        mysql_charset="utf8mb4",
    )
    op.create_table(
        "obsidian_settings",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("api_key_hash", sa.String(64), nullable=True),
        sa.Column("api_key_created_at", sa.DateTime, nullable=True),
        sa.Column("sync_root", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        mysql_charset="utf8mb4",
    )


def downgrade() -> None:
    op.drop_table("obsidian_settings")
    op.drop_table("obsidian_notes")
