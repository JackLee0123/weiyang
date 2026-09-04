from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"mysql_charset": "utf8mb4"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc, nullable=False)

    tokens: Mapped[list["AuthToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class AuthToken(Base):
    __tablename__ = "auth_tokens"
    __table_args__ = {"mysql_charset": "utf8mb4"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    user: Mapped[User] = relationship(back_populates="tokens")


class Plan(Base):
    __tablename__ = "plans"
    __table_args__ = {"mysql_charset": "utf8mb4"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    start_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    end_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    priority: Mapped[str] = mapped_column(String(10), default="medium", nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="默认", nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    images: Mapped[Optional[list]] = mapped_column(JSON, default=list, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc, nullable=False)

    records: Mapped[list["Record"]] = relationship(back_populates="linked_plan")


class Record(Base):
    __tablename__ = "records"
    __table_args__ = {"mysql_charset": "utf8mb4"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, default="")
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    done_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="默认", nullable=False)
    linked_plan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    images: Mapped[Optional[list]] = mapped_column(JSON, default=list, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)

    linked_plan: Mapped[Optional[Plan]] = relationship(back_populates="records")


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = {"mysql_charset": "utf8mb4"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    term: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    teacher: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_period: Mapped[int] = mapped_column(Integer, nullable=False)
    end_period: Mapped[int] = mapped_column(Integer, nullable=False)
    week_mask: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    week_label: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    credit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    course_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)


class TimetableSettings(Base):
    __tablename__ = "timetable_settings"
    __table_args__ = {"mysql_charset": "utf8mb4"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    active_term: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    week1_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    period_times: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc, nullable=False)
