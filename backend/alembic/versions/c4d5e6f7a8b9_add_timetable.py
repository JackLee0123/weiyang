"""add timetable tables and plan source

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-08-27
"""

from alembic import op
import sqlalchemy as sa


revision = "c4d5e6f7a8b9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 开发环境会先用 create_all 建出新表，这里做幂等处理，避免重复建表。
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "courses" not in tables:
        op.create_table(
            "courses",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("term", sa.String(length=20), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("code", sa.String(length=50), nullable=True),
            sa.Column("teacher", sa.String(length=80), nullable=True),
            sa.Column("location", sa.String(length=120), nullable=True),
            sa.Column("day_of_week", sa.Integer(), nullable=False),
            sa.Column("start_period", sa.Integer(), nullable=False),
            sa.Column("end_period", sa.Integer(), nullable=False),
            sa.Column("week_mask", sa.Text(), nullable=True),
            sa.Column("week_label", sa.String(length=80), nullable=True),
            sa.Column("credit", sa.Float(), nullable=True),
            sa.Column("course_type", sa.String(length=50), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            mysql_charset="utf8mb4",
        )
        op.create_index(op.f("ix_courses_user_id"), "courses", ["user_id"], unique=False)
        op.create_index(op.f("ix_courses_term"), "courses", ["term"], unique=False)
        op.create_foreign_key("fk_courses_user_id", "courses", "users", ["user_id"], ["id"], ondelete="CASCADE")

    if "timetable_settings" not in tables:
        op.create_table(
            "timetable_settings",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("active_term", sa.String(length=20), nullable=False),
            sa.Column("week1_date", sa.String(length=10), nullable=True),
            sa.Column("period_times", sa.JSON(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            mysql_charset="utf8mb4",
        )
        op.create_index(op.f("ix_timetable_settings_user_id"), "timetable_settings", ["user_id"], unique=True)
        op.create_foreign_key("fk_timetable_settings_user_id", "timetable_settings", "users", ["user_id"], ["id"], ondelete="CASCADE")

    plan_columns = {c["name"] for c in inspector.get_columns("plans")}
    if "source" not in plan_columns:
        op.add_column("plans", sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    plan_columns = {c["name"] for c in inspector.get_columns("plans")}
    if "source" in plan_columns:
        op.drop_column("plans", "source")
    if "timetable_settings" in tables:
        op.drop_table("timetable_settings")
    if "courses" in tables:
        op.drop_table("courses")
