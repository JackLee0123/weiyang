from __future__ import annotations

import asyncio
from datetime import date, datetime, time, timedelta
import logging
from typing import Optional, Sequence

from sqlalchemy.orm import Session

from .. import models, repository
from ..config import settings
from ..database import SessionLocal
from . import push as push_service

logger = logging.getLogger(__name__)


def _parse_time(hhmm: str) -> time:
    hour, minute = map(int, hhmm.split(":"))
    return time(hour, minute)


def _day_matches(schedule: models.PushSchedule, d: date) -> bool:
    recurrence = schedule.recurrence
    if recurrence == "daily":
        return True
    if recurrence == "weekly":
        return d.weekday() in (schedule.days_of_week or [])
    if recurrence == "monthly":
        return d.day in (schedule.day_of_month or [])
    if recurrence == "yearly":
        return (schedule.month, schedule.day) == (d.month, d.day)
    return False


def _occurrences_on(schedule: models.PushSchedule, d: date) -> list[datetime]:
    if not _day_matches(schedule, d):
        return []
    return [datetime.combine(d, _parse_time(item)) for item in (schedule.times or [])]


def next_fire(schedule: models.PushSchedule, now: datetime) -> Optional[datetime]:
    """返回下一次应触发的时刻（用于界面预览）。"""
    for offset in range(0, 367):
        day = now.date() + timedelta(days=offset)
        for dt in _occurrences_on(schedule, day):
            if dt > now:
                return dt
    return None


def _due(schedule: models.PushSchedule, now: datetime) -> Optional[datetime]:
    """返回当前窗口内尚未触发的最新一次到期时刻。"""
    grace = timedelta(seconds=settings.push_scheduler_grace_seconds)
    for day in (now.date(), now.date() - timedelta(days=1)):
        for dt in _occurrences_on(schedule, day):
            if dt <= now <= dt + grace and (schedule.last_fired_at is None or schedule.last_fired_at < dt):
                return dt
    return None


def _plans_lines(db: Session, user_id: int, start: date, end: date, limit: int = 6) -> tuple[Sequence[models.Plan], int]:
    plans = repository.list_plans(db, user_id, start=start.isoformat(), end=end.isoformat())
    if not plans:
        return [], 0
    return plans[:limit], len(plans)


def build_content(schedule: models.PushSchedule, db: Session, user_id: int) -> Optional[tuple[str, str]]:
    """构造提醒标题与正文；当前周期无任务时返回 None。"""
    today = date.today()
    if schedule.recurrence == "daily":
        end = today + timedelta(days=schedule.batch_days or 0)
        plans = repository.list_plans(db, user_id, start=today.isoformat(), end=end.isoformat())
        if not plans:
            return None
        total = len(plans)
        if schedule.batch_days and schedule.batch_days > 0:
            grouped: dict[str, list[models.Plan]] = {}
            for plan in plans:
                grouped.setdefault(plan.date, []).append(plan)
            parts = []
            for d, items in sorted(grouped.items()):
                label = "今天" if d == today.isoformat() else f"{d[5:]}"
                names = "、".join(item.title for item in items[:5])
                parts.append(f"{label}：{names}")
            return ("未来几天任务", f"未来 {len(grouped)} 天共 {total} 项：\n" + "\n".join(parts))
        names = "、".join(plan.title for plan in plans[:6])
        return ("今日任务", f"今天有 {total} 项任务：\n{names}")

    if schedule.recurrence == "weekly":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        label = "本周"
    elif schedule.recurrence == "monthly":
        start = today.replace(day=1)
        next_month = start + timedelta(days=32)
        end = (next_month.replace(day=1) - timedelta(days=1))
        label = "本月"
    else:  # yearly
        start = today.replace(month=1, day=1)
        end = today.replace(month=12, day=31)
        label = "今年"

    plans, total = _plans_lines(db, user_id, start, end)
    if not plans:
        return None
    names = "、".join(plan.title for plan in plans)
    suffix = f" 等共 {total} 项" if total > len(plans) else f"共 {total} 项"
    return (f"{label}计划", f"{label}计划{suffix}：\n{names}")


def process_due(db: Session) -> None:
    """扫描到期提醒并推送。只能在有 VAPID 配置且存在订阅时生效。"""
    if not push_service.server_supported():
        return
    for schedule in repository.list_enabled_push_schedules(db):
        now = datetime.now()
        due = _due(schedule, now)
        if due is None:
            continue
        # 没有有效订阅时也标记已触发，避免在宽限窗口内反复扫描。
        if not repository.list_subscriptions(db, schedule.user_id):
            schedule.last_fired_at = due
            db.commit()
            continue
        content = build_content(schedule, db, schedule.user_id)
        if content:
            title, body = content
            push_service.send_to_user(db, schedule.user_id, title=title, body=body, url="/notifications")
        schedule.last_fired_at = due
        db.commit()


def _tick() -> None:
    db = SessionLocal()
    try:
        process_due(db)
    finally:
        db.close()


async def push_scheduler_loop() -> None:
    logger.info("push scheduler started")
    while True:
        try:
            await asyncio.to_thread(_tick)
        except asyncio.CancelledError:
            logger.info("push scheduler stopped")
            raise
        except Exception:
            logger.exception("push scheduler tick error")
        await asyncio.sleep(settings.push_scheduler_interval_seconds)
