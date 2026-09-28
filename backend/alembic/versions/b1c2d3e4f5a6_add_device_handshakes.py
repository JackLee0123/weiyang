"""replace device pair codes with device handshakes

手环连接改由设备端发起：手环生成一次性短码并显示二维码，手机端扫码确认后
手环轮询领取访问令牌，因此旧的「网页发码 / 手环输码」表不再需要。

Revision ID: b1c2d3e4f5a6
Revises: a8b9c0d1e2f3
Create Date: 2026-09-28
"""

from alembic import op
import sqlalchemy as sa


revision = "b1c2d3e4f5a6"
down_revision = "a8b9c0d1e2f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 开发环境会先用 create_all 建出新表，这里统一做幂等处理。
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "device_pair_codes" in tables:
        op.drop_table("device_pair_codes")

    if "device_handshakes" not in tables:
        op.create_table(
            "device_handshakes",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("code", sa.String(length=6), nullable=False),
            sa.Column("poll_token_hash", sa.String(length=64), nullable=False),
            sa.Column("device_label", sa.String(length=80), nullable=False, server_default=""),
            sa.Column("status", sa.String(length=12), nullable=False, server_default="pending"),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column("claimed_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            # SQLite 不支持后续 ALTER 加外键，统一在建表时声明。
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            mysql_charset="utf8mb4",
        )
        op.create_index(op.f("ix_device_handshakes_code"), "device_handshakes", ["code"], unique=True)
        op.create_index(
            op.f("ix_device_handshakes_poll_token_hash"),
            "device_handshakes",
            ["poll_token_hash"],
            unique=True,
        )
        op.create_index(op.f("ix_device_handshakes_user_id"), "device_handshakes", ["user_id"], unique=False)

    # 访问令牌补上设备维度，「已连接设备」列表与解绑都依赖它。
    if "auth_tokens" in tables:
        columns = {column["name"] for column in inspector.get_columns("auth_tokens")}
        if "device_kind" not in columns:
            op.add_column(
                "auth_tokens",
                sa.Column("device_kind", sa.String(length=16), nullable=False, server_default="web"),
            )
        if "device_label" not in columns:
            op.add_column("auth_tokens", sa.Column("device_label", sa.String(length=80), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "auth_tokens" in tables:
        columns = {column["name"] for column in inspector.get_columns("auth_tokens")}
        for name in ("device_label", "device_kind"):
            if name in columns:
                try:
                    op.drop_column("auth_tokens", name)
                except Exception:  # SQLite 老版本不支持 DROP COLUMN，回滚时忽略即可。
                    pass

    if "device_handshakes" in tables:
        op.drop_table("device_handshakes")

    if "device_pair_codes" not in tables:
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
        op.create_index(op.f("ix_device_pair_codes_code"), "device_pair_codes", ["code"], unique=True)
        op.create_index(op.f("ix_device_pair_codes_user_id"), "device_pair_codes", ["user_id"], unique=False)
