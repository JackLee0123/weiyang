"""add per-user isolation

Revision ID: a1b2c3d4e5f6
Revises: 01798d98d839
Create Date: 2026-08-23
"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "01798d98d839"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        mysql_charset="utf8mb4",
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "auth_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        mysql_charset="utf8mb4",
    )
    op.create_index(op.f("ix_auth_tokens_user_id"), "auth_tokens", ["user_id"], unique=False)
    op.create_index(op.f("ix_auth_tokens_token_hash"), "auth_tokens", ["token_hash"], unique=True)

    op.add_column("plans", sa.Column("user_id", sa.Integer(), nullable=False))
    op.create_index(op.f("ix_plans_user_id"), "plans", ["user_id"], unique=False)
    op.create_foreign_key("fk_plans_user_id", "plans", "users", ["user_id"], ["id"], ondelete="CASCADE")

    op.add_column("records", sa.Column("user_id", sa.Integer(), nullable=False))
    op.create_index(op.f("ix_records_user_id"), "records", ["user_id"], unique=False)
    op.create_foreign_key("fk_records_user_id", "records", "users", ["user_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint("fk_records_user_id", "records", type_="foreignkey")
    op.drop_index(op.f("ix_records_user_id"), table_name="records")
    op.drop_column("records", "user_id")

    op.drop_constraint("fk_plans_user_id", "plans", type_="foreignkey")
    op.drop_index(op.f("ix_plans_user_id"), table_name="plans")
    op.drop_column("plans", "user_id")

    op.drop_index(op.f("ix_auth_tokens_token_hash"), table_name="auth_tokens")
    op.drop_index(op.f("ix_auth_tokens_user_id"), table_name="auth_tokens")
    op.drop_table("auth_tokens")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
