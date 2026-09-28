"""add device pair codes table

Revision ID: a8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-09-28
"""

from alembic import op
import sqlalchemy as sa


revision = "a8b9c0d1e2f3"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 开发环境会先用 create_all 建出新表，这里做幂等处理，避免重复建表。
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "device_pair_codes" in set(inspector.get_table_names()):
        return
    op.create_table(
        "device_pair_codes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        mysql_charset="utf8mb4",
    )
    # 手环端只有 6 位数字，靠唯一索引保证一码一人；配对码按用户维度过期与作废。
    op.create_index(op.f("ix_device_pair_codes_code"), "device_pair_codes", ["code"], unique=True)
    op.create_index(op.f("ix_device_pair_codes_user_id"), "device_pair_codes", ["user_id"], unique=False)
    op.create_foreign_key(
        "fk_device_pair_codes_user_id",
        "device_pair_codes",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "device_pair_codes" not in set(inspector.get_table_names()):
        return
    op.drop_table("device_pair_codes")
