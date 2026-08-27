from typing import Optional

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..services import timetable as timetable_service
from ..services import wisedu as wisedu_service

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


@router.post("/parse", response_model=schemas.ParseTimetableOut)
async def parse_timetable(
    file: Optional[UploadFile] = File(default=None),
    raw_text: Optional[str] = Form(default=None),
    term: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
):
    """解析上传的 Excel/HTML/ICS 或粘贴文本，返回预览（不保存）。"""
    file_data = await file.read() if file else None
    filename = file.filename if file else None
    return timetable_service.parse_payload(file_data, filename, raw_text, term)


@router.post("/wisedu/captcha", response_model=schemas.WiseduCaptchaOut)
def wisedu_captcha(
    data: Optional[schemas.WiseduCaptchaIn] = Body(default=None),
    current_user: User = Depends(get_current_user),
):
    try:
        token, image = wisedu_service.create_captcha(data.base_url if data else None)
    except wisedu_service.WiseduError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return schemas.WiseduCaptchaOut(captcha_token=token, image=image)


@router.post("/wisedu/fetch", response_model=schemas.ParseTimetableOut)
def wisedu_fetch(
    data: schemas.WiseduFetchIn,
    current_user: User = Depends(get_current_user),
):
    """使用一次性学号/密码/验证码登录教务系统并抓取课表，返回预览（不保存凭证）。"""
    try:
        rows, detected = wisedu_service.fetch_timetable_with_login(
            data.username,
            data.password,
            data.captcha_token,
            data.captcha_code,
            data.term,
            data.base_url,
        )
    except wisedu_service.WiseduError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    warnings: list[str] = []
    courses = timetable_service.parse_arranged_list(rows, detected, warnings)
    return schemas.ParseTimetableOut(term=detected, courses=courses, warnings=warnings)


@router.post("/courses", response_model=schemas.CourseBulkOut)
def save_courses(
    data: schemas.CourseBulkIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """保存某学期课表（默认替换该学期）并更新设置。"""
    period_times = [p.model_dump() for p in data.period_times] if data.period_times else timetable_service.default_period_times()
    saved = repository.replace_courses(db, current_user.id, data.term, data.courses)
    repository.upsert_timetable_settings(
        db,
        current_user.id,
        active_term=data.term,
        week1_date=data.week1_date,
        period_times=period_times,
    )
    return schemas.CourseBulkOut(term=data.term, saved=saved)


@router.get("/courses")
def list_courses(
    term: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    courses = repository.list_courses(db, current_user.id, term)
    settings = repository.get_timetable_settings(db, current_user.id)
    period_times = (settings.period_times if settings and settings.period_times else None) or timetable_service.default_period_times()
    return {
        "term": term or (settings.active_term if settings else None),
        "courses": [schemas.CourseOut.model_validate(c).model_dump(mode="json") for c in courses],
        "settings": {
            "active_term": (settings.active_term if settings else term or ""),
            "week1_date": (settings.week1_date if settings else None),
            "period_times": period_times,
        },
    }


@router.delete("/courses/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = repository.get_course(db, current_user.id, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    repository.delete_course(db, course)
    return None


@router.get("/settings", response_model=schemas.TimetableSettingsOut)
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = repository.get_timetable_settings(db, current_user.id)
    return schemas.TimetableSettingsOut(
        active_term=(settings.active_term if settings else ""),
        week1_date=(settings.week1_date if settings else None),
        period_times=(settings.period_times if settings and settings.period_times else None)
        or timetable_service.default_period_times(),
    )


@router.patch("/settings", response_model=schemas.TimetableSettingsOut)
def update_settings(
    data: schemas.TimetableSettingsIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    period_times = [p.model_dump() for p in data.period_times] if data.period_times else None
    settings = repository.upsert_timetable_settings(
        db,
        current_user.id,
        active_term=data.active_term,
        week1_date=data.week1_date,
        period_times=period_times,
    )
    return schemas.TimetableSettingsOut(
        active_term=settings.active_term,
        week1_date=settings.week1_date,
        period_times=(settings.period_times if settings.period_times else None) or timetable_service.default_period_times(),
    )


@router.post("/generate-plans", response_model=schemas.GeneratePlansOut)
def generate_plans(
    data: schemas.GeneratePlansIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return schemas.GeneratePlansOut(**repository.generate_timetable_plans(db, current_user.id, data.term, data.week_start))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
