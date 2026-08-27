from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from . import models, schemas
from .models import now_utc
from .services.timetable import resolve_weeks


def today_iso() -> str:
    """返回服务器本地日期的 ISO 格式（yyyy-mm-dd），用于判断“今天”。"""
    return date.today().isoformat()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.scalar(select(models.User).where(models.User.email == email))


def create_user(db: Session, name: str, email: str, password_hash: str) -> models.User:
    user = models.User(name=name, email=email, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_auth_token(db: Session, user_id: int, token_hash: str, expires_at) -> models.AuthToken:
    token = models.AuthToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


def get_user_by_token(db: Session, token_hash: str) -> Optional[models.User]:
    return db.scalar(
        select(models.User)
        .join(models.AuthToken, models.AuthToken.user_id == models.User.id)
        .where(models.AuthToken.token_hash == token_hash, models.AuthToken.expires_at > now_utc())
    )


def revoke_token(db: Session, token_hash: str) -> None:
    token = db.scalar(select(models.AuthToken).where(models.AuthToken.token_hash == token_hash))
    if token:
        db.delete(token)
        db.commit()


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    tokens = db.scalars(select(models.AuthToken).where(models.AuthToken.user_id == user_id)).all()
    for token in tokens:
        db.delete(token)
    db.commit()


def _plan_filters(
    stmt,
    start: Optional[str],
    end: Optional[str],
    status: Optional[str],
    category: Optional[str],
    q: Optional[str],
):
    if start:
        stmt = stmt.where(models.Plan.date >= start)
    if end:
        stmt = stmt.where(models.Plan.date <= end)
    if status:
        stmt = stmt.where(models.Plan.status == status)
    if category:
        stmt = stmt.where(models.Plan.category == category)
    if q:
        stmt = stmt.where(or_(models.Plan.title.ilike(f"%{q}%"), models.Plan.description.ilike(f"%{q}%")))
    return stmt


def list_plans(
    db: Session,
    user_id: int,
    start: Optional[str] = None,
    end: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
) -> list[models.Plan]:
    stmt = select(models.Plan).where(models.Plan.user_id == user_id)
    stmt = _plan_filters(stmt, start, end, status, category, q)
    stmt = stmt.order_by(
        models.Plan.date.asc(),
        func.coalesce(models.Plan.start_time, "99:99").asc(),
        models.Plan.id.asc(),
    )
    return list(db.scalars(stmt).all())


def list_unfinished_plans(db: Session, user_id: int) -> list[models.Plan]:
    """返回用户的「未央」计划：今天及以前仍未完成（待办/进行中）的计划。"""
    stmt = (
        select(models.Plan)
        .where(
            models.Plan.user_id == user_id,
            models.Plan.status.in_(["pending", "in_progress"]),
            models.Plan.date <= today_iso(),
        )
        .order_by(
            models.Plan.date.asc(),
            func.coalesce(models.Plan.start_time, "99:99").asc(),
            models.Plan.id.asc(),
        )
    )
    return list(db.scalars(stmt).all())


def get_plan(db: Session, user_id: int, plan_id: int) -> Optional[models.Plan]:
    return db.scalar(select(models.Plan).where(models.Plan.id == plan_id, models.Plan.user_id == user_id))


def create_plan(db: Session, user_id: int, data: schemas.PlanCreate) -> models.Plan:
    plan = models.Plan(user_id=user_id, **data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def update_plan(db: Session, plan: models.Plan, data: schemas.PlanUpdate) -> models.Plan:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)
    db.commit()
    db.refresh(plan)
    return plan


def delete_plan(db: Session, plan: models.Plan) -> None:
    db.delete(plan)
    db.commit()


def list_courses(db: Session, user_id: int, term: Optional[str] = None) -> list[models.Course]:
    stmt = select(models.Course).where(models.Course.user_id == user_id)
    if term:
        stmt = stmt.where(models.Course.term == term)
    stmt = stmt.order_by(models.Course.day_of_week.asc(), models.Course.start_period.asc(), models.Course.id.asc())
    return list(db.scalars(stmt).all())


def get_course(db: Session, user_id: int, course_id: int) -> Optional[models.Course]:
    return db.scalar(select(models.Course).where(models.Course.id == course_id, models.Course.user_id == user_id))


def replace_courses(db: Session, user_id: int, term: str, courses: list[schemas.CourseDraft]) -> int:
    db.query(models.Course).filter(models.Course.user_id == user_id, models.Course.term == term).delete()
    db.flush()
    for draft in courses:
        db.add(models.Course(user_id=user_id, **draft.model_dump()))
    db.commit()
    return len(courses)


def delete_course(db: Session, course: models.Course) -> None:
    db.delete(course)
    db.commit()


def get_timetable_settings(db: Session, user_id: int) -> Optional[models.TimetableSettings]:
    return db.scalar(select(models.TimetableSettings).where(models.TimetableSettings.user_id == user_id))


def upsert_timetable_settings(
    db: Session,
    user_id: int,
    active_term: str,
    week1_date: Optional[str],
    period_times: Optional[list[dict]],
) -> models.TimetableSettings:
    settings = get_timetable_settings(db, user_id)
    if settings is None:
        settings = models.TimetableSettings(user_id=user_id)
        db.add(settings)
    settings.active_term = active_term
    settings.week1_date = week1_date
    settings.period_times = period_times
    db.commit()
    db.refresh(settings)
    return settings


def generate_timetable_plans(
    db: Session,
    user_id: int,
    term: str,
    week_start: str,
) -> dict[str, int]:
    """把某周的课表生成到计划，按 (date,title,start_time,source) 去重，跳过过去日期。"""
    from .models import Plan

    today = today_iso()
    week_start_date = date.fromisoformat(week_start)
    settings = get_timetable_settings(db, user_id)
    week1_text = settings.week1_date if settings else None
    period_times = (settings.period_times if settings else None) or []
    if not week1_text:
        raise ValueError("请先设置开学第 1 周周一的日期")
    week1 = date.fromisoformat(week1_text)
    week_index = (week_start_date - week1).days // 7 + 1
    if week_index < 1:
        raise ValueError("所选周早于第 1 周")

    created = skipped_past = skipped_duplicate = 0
    courses = list_courses(db, user_id, term)
    for course in courses:
        weeks = resolve_weeks(course.week_mask, course.week_label)
        if weeks and week_index not in weeks:
            continue
        plan_date = (week_start_date + timedelta(days=course.day_of_week - 1)).isoformat()
        if plan_date < today:
            skipped_past += 1
            continue
        start_time = _period_start(period_times, course.start_period)
        end_time = _period_end(period_times, course.end_period)
        duplicate = db.scalar(
            select(Plan.id).where(
                Plan.user_id == user_id,
                Plan.date == plan_date,
                Plan.title == course.name,
                Plan.start_time == start_time,
                Plan.source == "timetable",
            )
        )
        if duplicate:
            skipped_duplicate += 1
            continue
        parts = [p for p in (course.teacher, course.location, course.week_label) if p]
        db.add(
            Plan(
                user_id=user_id,
                date=plan_date,
                title=course.name,
                description=" · ".join(parts),
                start_time=start_time,
                end_time=end_time,
                status="pending",
                priority="medium",
                category="课程",
                source="timetable",
            )
        )
        created += 1
    db.commit()
    return {"created": created, "skipped_past": skipped_past, "skipped_duplicate": skipped_duplicate}


def _period_start(period_times: list[dict], period: int) -> Optional[str]:
    if 0 < period <= len(period_times):
        return period_times[period - 1].get("start")
    return None


def _period_end(period_times: list[dict], period: int) -> Optional[str]:
    if 0 < period <= len(period_times):
        return period_times[period - 1].get("end")
    return None


def _record_filters(stmt, start: Optional[str], end: Optional[str], category: Optional[str], q: Optional[str]):
    if start:
        stmt = stmt.where(models.Record.date >= start)
    if end:
        stmt = stmt.where(models.Record.date <= end)
    if category:
        stmt = stmt.where(models.Record.category == category)
    if q:
        stmt = stmt.where(or_(models.Record.title.ilike(f"%{q}%"), models.Record.content.ilike(f"%{q}%")))
    return stmt


def list_records(
    db: Session,
    user_id: int,
    start: Optional[str] = None,
    end: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
) -> list[models.Record]:
    stmt = select(models.Record).where(models.Record.user_id == user_id)
    stmt = _record_filters(stmt, start, end, category, q)
    stmt = stmt.order_by(models.Record.date.desc(), models.Record.id.desc())
    return list(db.scalars(stmt).all())


def get_record(db: Session, user_id: int, record_id: int) -> Optional[models.Record]:
    return db.scalar(select(models.Record).where(models.Record.id == record_id, models.Record.user_id == user_id))


def create_record(db: Session, user_id: int, data: schemas.RecordCreate) -> models.Record:
    payload = data.model_dump()
    if data.is_completed:
        payload["done_at"] = now_utc()
    record = models.Record(user_id=user_id, **payload)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_record(db: Session, record: models.Record, data: schemas.RecordUpdate) -> models.Record:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    if "is_completed" in data.model_fields_set and record.is_completed:
        record.done_at = now_utc()
    db.commit()
    db.refresh(record)
    return record


def delete_record(db: Session, record: models.Record) -> None:
    db.delete(record)
    db.commit()


def _minutes_from_times(start: Optional[str], end: Optional[str]) -> int:
    if not start or not end:
        return 0
    try:
        sh, sm = map(int, start.split(":"))
        eh, em = map(int, end.split(":"))
    except ValueError:
        return 0
    start_min = sh * 60 + sm
    end_min = eh * 60 + em
    return (end_min - start_min) % (24 * 60)


def stats_overview(db: Session, user_id: int, start: str, end: str) -> schemas.StatsOverview:
    plans = list_plans(db, user_id, start=start, end=end)
    records = list_records(db, user_id, start=start, end=end)

    total_plans = len(plans)
    done_plans = sum(1 for p in plans if p.status == "done")
    completion_rate = round(done_plans / total_plans, 4) if total_plans else 0.0
    planned_minutes = sum(_minutes_from_times(p.start_time, p.end_time) for p in plans)
    recorded_minutes = sum(r.duration_minutes or 0 for r in records)

    by_category: dict[str, int] = {}
    for r in records:
        by_category[r.category] = by_category.get(r.category, 0) + 1

    # 逐日聚合
    day_map: dict[str, dict] = {}
    for p in plans:
        entry = day_map.setdefault(p.date, {"total": 0, "done": 0, "planned": 0, "records": 0, "recorded": 0})
        entry["total"] += 1
        if p.status == "done":
            entry["done"] += 1
        entry["planned"] += _minutes_from_times(p.start_time, p.end_time)
    for r in records:
        entry = day_map.setdefault(r.date, {"total": 0, "done": 0, "planned": 0, "records": 0, "recorded": 0})
        entry["records"] += 1
        entry["recorded"] += r.duration_minutes or 0

    days = [
        schemas.StatsDay(
            date=d,
            total_plans=v["total"],
            done_plans=v["done"],
            planned_minutes=v["planned"],
            records_count=v["records"],
            recorded_minutes=v["recorded"],
        )
        for d, v in sorted(day_map.items())
    ]

    # 连续记录天数：从今天（若无则昨天）向前连续有记录的日子
    record_dates = {r.date for r in records}
    cursor: date = date.today()
    if cursor.isoformat() not in record_dates:
        cursor -= timedelta(days=1)
    streak = 0
    while cursor.isoformat() in record_dates:
        streak += 1
        cursor -= timedelta(days=1)

    return schemas.StatsOverview(
        start=start,
        end=end,
        total_plans=total_plans,
        done_plans=done_plans,
        completion_rate=completion_rate,
        planned_minutes=planned_minutes,
        recorded_minutes=recorded_minutes,
        by_category=by_category,
        days=days,
        consecutive_recording_days=streak,
    )


def heatmap_points(db: Session, user_id: int, start: str, end: str) -> list[schemas.HeatmapDay]:
    """返回日期范围内按天聚合的活跃数据（仅包含有活动的天）。"""
    plans = list_plans(db, user_id, start=start, end=end)
    records = list_records(db, user_id, start=start, end=end)

    day_map: dict[str, dict[str, int]] = {}
    for p in plans:
        if p.status == "done":
            entry = day_map.setdefault(p.date, {"completed_plans": 0, "records_count": 0})
            entry["completed_plans"] += 1
    for r in records:
        entry = day_map.setdefault(r.date, {"completed_plans": 0, "records_count": 0})
        entry["records_count"] += 1

    return [
        schemas.HeatmapDay(date=d, completed_plans=v["completed_plans"], records_count=v["records_count"])
        for d, v in sorted(day_map.items())
    ]


def memory_report(db: Session, user_id: int, start: str, end: str) -> schemas.MemoryReport:
    """聚合一段时间的「回忆」：计划与记录的概览、类别分布、未央清单等。"""
    plans = list_plans(db, user_id, start=start, end=end)
    records = list_records(db, user_id, start=start, end=end)

    total_plans = len(plans)
    done_plans = sum(1 for p in plans if p.status == "done")
    unfinished_plans = sum(1 for p in plans if p.status in ("pending", "in_progress"))
    cancelled_plans = sum(1 for p in plans if p.status == "cancelled")
    completion_rate = round(done_plans / total_plans, 4) if total_plans else 0.0

    records_count = len(records)
    recorded_minutes = sum(r.duration_minutes or 0 for r in records)

    by_category: dict[str, int] = {}
    for r in records:
        by_category[r.category] = by_category.get(r.category, 0) + 1
    top_categories = [name for name, _ in sorted(by_category.items(), key=lambda kv: kv[1], reverse=True)[:3]]

    active_days = len({r.date for r in records})

    day_counts: dict[str, int] = {}
    for r in records:
        day_counts[r.date] = day_counts.get(r.date, 0) + 1
    busiest_day = max(day_counts.items(), key=lambda kv: kv[1])[0] if day_counts else None

    # 连续记录天数：以周期末尾为锚，向前数连续有记录的日子
    record_dates = {r.date for r in records}
    cursor = date.fromisoformat(end)
    if cursor.isoformat() not in record_dates:
        cursor -= timedelta(days=1)
    streak = 0
    while cursor.isoformat() in record_dates:
        streak += 1
        cursor -= timedelta(days=1)

    period_days = (date.fromisoformat(end) - date.fromisoformat(start)).days + 1

    unfinished = [schemas.PlanOut.model_validate(p) for p in plans if p.status in ("pending", "in_progress")]

    return schemas.MemoryReport(
        start=start,
        end=end,
        period_days=period_days,
        records_count=records_count,
        recorded_minutes=recorded_minutes,
        active_days=active_days,
        consecutive_recording_days=streak,
        total_plans=total_plans,
        done_plans=done_plans,
        unfinished_plans=unfinished_plans,
        cancelled_plans=cancelled_plans,
        completion_rate=completion_rate,
        by_category=by_category,
        top_categories=top_categories,
        busiest_day=busiest_day,
        unfinished=unfinished,
    )


def list_users(db: Session) -> list[models.User]:
    return list(db.scalars(select(models.User).order_by(models.User.id.asc())).all())


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.scalar(select(models.User).where(models.User.id == user_id))


def update_user(db: Session, user: models.User, fields: dict) -> models.User:
    for key, value in fields.items():
        if value is not None:
            setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: models.User) -> None:
    db.delete(user)
    db.commit()
