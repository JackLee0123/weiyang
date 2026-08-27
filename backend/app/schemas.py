from datetime import datetime
import re
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


PlanStatus = Literal["pending", "in_progress", "done", "cancelled"]
Priority = Literal["high", "medium", "low"]
DATE_RE = r"^\d{4}-\d{2}-\d{2}$"
TIME_RE = r"^([01]\d|2[0-3]):[0-5]\d$"
EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
PASSWORD_MIN_LENGTH = 8


class SendCodeIn(BaseModel):
    email: str = Field(..., pattern=EMAIL_RE, max_length=255)


class PasswordPolicy(BaseModel):
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH, max_length=128)

    @field_validator("password")
    @classmethod
    def _password_complexity(cls, value: str) -> str:
        classes = sum(
            [
                bool(re.search(r"[a-z]", value)),
                bool(re.search(r"[A-Z]", value)),
                bool(re.search(r"\d", value)),
                bool(re.search(r"[^A-Za-z0-9]", value)),
            ]
        )
        if classes < 2:
            raise ValueError("密码需包含大写字母、小写字母、数字、特殊符号中的至少两种")
        return value


class RegisterIn(PasswordPolicy):
    name: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., pattern=EMAIL_RE, max_length=255)
    code: str = Field(..., min_length=4, max_length=10)
    captcha_token: str = Field(..., min_length=1, max_length=128)


class ForgotPasswordIn(BaseModel):
    email: str = Field(..., pattern=EMAIL_RE, max_length=255)
    captcha_token: str = Field(..., min_length=1, max_length=128)


class ResetPasswordIn(PasswordPolicy):
    email: str = Field(..., pattern=EMAIL_RE, max_length=255)
    code: str = Field(..., min_length=4, max_length=10)


class ResetPasswordOut(BaseModel):
    message: str


class LoginIn(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., max_length=128)
    captcha_token: str = Field(..., min_length=1, max_length=128)


class SendCodeOut(BaseModel):
    message: str
    expires_in: int
    cooldown: int
    dev_code: Optional[str] = None


class CaptchaCreateOut(BaseModel):
    captcha_id: str
    background: str
    piece: str
    piece_y: int
    piece_width: int
    piece_height: int
    width: int
    height: int
    target_x: Optional[int] = None


class CaptchaVerifyIn(BaseModel):
    captcha_id: str
    x: float


class CaptchaVerifyOut(BaseModel):
    captcha_token: str


class AuthUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    name: str
    is_admin: bool = False
    is_active: bool = True


class AuthSessionOut(AuthUserOut):
    token: str
    expires_in: int


class AdminUserOut(AuthUserOut):
    created_at: datetime


class AdminUserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    email: Optional[str] = Field(default=None, pattern=EMAIL_RE, max_length=255)
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _password_complexity(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if len(value) < PASSWORD_MIN_LENGTH:
            raise ValueError("密码至少需要 8 位")
        classes = sum(
            [
                bool(re.search(r"[a-z]", value)),
                bool(re.search(r"[A-Z]", value)),
                bool(re.search(r"\d", value)),
                bool(re.search(r"[^A-Za-z0-9]", value)),
            ]
        )
        if classes < 2:
            raise ValueError("密码需包含大写字母、小写字母、数字、特殊符号中的至少两种")
        return value


class PlanBase(BaseModel):
    date: str = Field(..., pattern=DATE_RE)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    start_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    end_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    status: PlanStatus = "pending"
    priority: Priority = "medium"
    category: str = "默认"


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    date: Optional[str] = Field(default=None, pattern=DATE_RE)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    start_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    end_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    status: Optional[PlanStatus] = None
    priority: Optional[Priority] = None
    category: Optional[str] = None


class PlanOut(PlanBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class RecordBase(BaseModel):
    date: str = Field(..., pattern=DATE_RE)
    title: str = Field(..., min_length=1, max_length=200)
    content: str = ""
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    is_completed: bool = True
    category: str = "默认"
    linked_plan_id: Optional[int] = None


class RecordCreate(RecordBase):
    pass


class RecordUpdate(BaseModel):
    date: Optional[str] = Field(default=None, pattern=DATE_RE)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    is_completed: Optional[bool] = None
    category: Optional[str] = None
    linked_plan_id: Optional[int] = None


class RecordOut(RecordBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    done_at: Optional[datetime] = None
    created_at: datetime


class StatsDay(BaseModel):
    date: str
    total_plans: int
    done_plans: int
    planned_minutes: int
    records_count: int
    recorded_minutes: int


class StatsOverview(BaseModel):
    start: str
    end: str
    total_plans: int
    done_plans: int
    completion_rate: float
    planned_minutes: int
    recorded_minutes: int
    by_category: dict[str, int]
    days: list[StatsDay]
    consecutive_recording_days: int


class HeatmapDay(BaseModel):
    date: str
    completed_plans: int
    records_count: int


class HealthOut(BaseModel):
    status: str
    version: str


class FeedbackOut(BaseModel):
    submitted: bool
    message: str


class MemoryReport(BaseModel):
    start: str
    end: str
    period_days: int
    records_count: int
    recorded_minutes: int
    active_days: int
    consecutive_recording_days: int
    total_plans: int
    done_plans: int
    unfinished_plans: int
    cancelled_plans: int
    completion_rate: float
    by_category: dict[str, int]
    top_categories: list[str]
    busiest_day: Optional[str] = None
    unfinished: list[PlanOut]


class PeriodTime(BaseModel):
    start: str = Field(..., pattern=TIME_RE)
    end: str = Field(..., pattern=TIME_RE)


class CourseDraft(BaseModel):
    term: str = Field(..., max_length=20)
    name: str = Field(..., min_length=1, max_length=200)
    code: Optional[str] = Field(default=None, max_length=50)
    teacher: Optional[str] = Field(default=None, max_length=80)
    location: Optional[str] = Field(default=None, max_length=120)
    day_of_week: int = Field(..., ge=1, le=7)
    start_period: int = Field(..., ge=1)
    end_period: int = Field(..., ge=1)
    week_mask: Optional[str] = None
    week_label: Optional[str] = Field(default=None, max_length=80)
    credit: Optional[float] = Field(default=None, ge=0)
    course_type: Optional[str] = Field(default=None, max_length=50)

    @field_validator("end_period")
    @classmethod
    def _end_after_start(cls, value, info):
        start = info.data.get("start_period")
        if start is not None and value < start:
            raise ValueError("结束节次不能早于开始节次")
        return value


class CourseOut(CourseDraft):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class TimetableSettingsIn(BaseModel):
    active_term: str = ""
    week1_date: Optional[str] = Field(default=None, pattern=DATE_RE)
    period_times: Optional[list[PeriodTime]] = None


class TimetableSettingsOut(BaseModel):
    active_term: str = ""
    week1_date: Optional[str] = None
    period_times: list[PeriodTime] = []


class ParseTimetableIn(BaseModel):
    term: Optional[str] = Field(default=None, max_length=20)


class ParseTimetableOut(BaseModel):
    term: Optional[str] = None
    courses: list[CourseDraft]
    warnings: list[str] = []


class WiseduCaptchaOut(BaseModel):
    captcha_token: str
    image: str


class WiseduCaptchaIn(BaseModel):
    base_url: Optional[str] = Field(default=None, max_length=255)


class WiseduFetchIn(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)
    captcha_token: str = Field(..., min_length=1)
    captcha_code: Optional[str] = Field(default=None, max_length=16)
    term: Optional[str] = Field(default=None, max_length=20)
    base_url: Optional[str] = Field(default=None, max_length=255)


class CourseBulkIn(BaseModel):
    term: str = Field(..., max_length=20)
    courses: list[CourseDraft]
    week1_date: Optional[str] = Field(default=None, pattern=DATE_RE)
    period_times: Optional[list[PeriodTime]] = None
    replace: bool = True


class CourseBulkOut(BaseModel):
    term: str
    saved: int


class GeneratePlansIn(BaseModel):
    term: str = Field(..., max_length=20)
    week_start: str = Field(..., pattern=DATE_RE)


class GeneratePlansOut(BaseModel):
    created: int
    skipped_past: int
    skipped_duplicate: int
