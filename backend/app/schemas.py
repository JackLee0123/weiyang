import base64
from datetime import datetime
import re
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .services.images import MAX_IMAGES, normalize_data_uri


PlanStatus = Literal["pending", "in_progress", "done", "cancelled"]
Priority = Literal["high", "medium", "low"]
DATE_RE = r"^\d{4}-\d{2}-\d{2}$"
TIME_RE = r"^([01]\d|2[0-3]):[0-5]\d$"
EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
PASSWORD_MIN_LENGTH = 8


class SendCodeIn(BaseModel):
    email: str = Field(..., pattern=EMAIL_RE, max_length=255)
    captcha_token: str = Field(..., min_length=1, max_length=128)


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
    captcha_token: str = Field(..., min_length=1, max_length=128)


class ResetPasswordOut(BaseModel):
    message: str


class DeviceHandshakeStartIn(BaseModel):
    """手环发起握手时可以带上自己的名字，手机端确认页会显示出来。"""

    device_label: Optional[str] = Field(default=None, max_length=80)


class DeviceHandshakeStartOut(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    poll_token: str
    expires_in: int


class DeviceHandshakeInfoOut(BaseModel):
    """手机端确认页需要的信息。"""

    code: str = Field(..., min_length=6, max_length=6)
    device_label: str
    status: Literal["pending", "approved", "claimed", "expired"]
    expires_in: int


class DeviceHandshakePollIn(BaseModel):
    poll_token: str = Field(..., min_length=8, max_length=128)


class DeviceHandshakePollOut(BaseModel):
    """手环轮询结果：approved 时携带一次性下发的访问令牌。"""

    status: Literal["pending", "approved", "claimed", "expired", "invalid"]
    token: Optional[str] = None
    expires_in: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    device_label: Optional[str] = None


class DeviceOut(BaseModel):
    """已连接设备（本质是一条访问令牌）。"""

    id: int
    device_kind: str
    device_label: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False


class DeviceRevokeOut(BaseModel):
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


class AdminScheduleRow(BaseModel):
    """管理员批量导入时的一行日程（对应一条 Plan）。"""

    date: str = Field(..., pattern=DATE_RE)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    start_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    end_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    category: str = "日程"
    priority: Priority = "medium"
    status: PlanStatus = "pending"

    @field_validator("description")
    @classmethod
    def _clip_description(cls, value: str) -> str:
        return (value or "")[:2000]

    @field_validator("category")
    @classmethod
    def _clip_category(cls, value: str) -> str:
        return (value or "").strip()[:50] or "日程"


class AdminSchedulePreviewOut(BaseModel):
    rows: list[AdminScheduleRow]
    warnings: list[str]
    skipped: int
    columns: dict[str, str]


class AdminScheduleImportIn(BaseModel):
    rows: list[AdminScheduleRow] = Field(..., min_length=1, max_length=2000)
    user_ids: list[int] = Field(default_factory=list)
    include_self: bool = False
    all_users: bool = False
    skip_duplicates: bool = True


class AdminScheduleTargetOut(BaseModel):
    user_id: int
    name: str
    created: int
    skipped_past: int
    skipped_duplicate: int


class AdminScheduleImportOut(BaseModel):
    created: int
    skipped_past: int
    skipped_duplicate: int
    targets: list[AdminScheduleTargetOut]
    plan_ids: list[int] = []


class AdminScheduleRollbackIn(BaseModel):
    plan_ids: list[int] = Field(..., min_length=1, max_length=20000)


class AdminScheduleRollbackOut(BaseModel):
    deleted: int


class PlanBase(BaseModel):
    date: str = Field(..., pattern=DATE_RE)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    start_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    end_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    status: PlanStatus = "pending"
    priority: Priority = "medium"
    category: str = "默认"
    images: list[str] = []

    @field_validator("images", mode="before")
    @classmethod
    def _images_not_none(cls, value):
        return [] if value is None else value


class PlanCreate(PlanBase):
    @field_validator("images")
    @classmethod
    def _images_normalize(cls, value: list[str]) -> list[str]:
        if len(value) > MAX_IMAGES:
            raise ValueError(f"最多上传 {MAX_IMAGES} 张图片")
        return [normalize_data_uri(item) for item in value]


class PlanUpdate(BaseModel):
    date: Optional[str] = Field(default=None, pattern=DATE_RE)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    start_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    end_time: Optional[str] = Field(default=None, pattern=TIME_RE)
    status: Optional[PlanStatus] = None
    priority: Optional[Priority] = None
    category: Optional[str] = None
    images: Optional[list[str]] = None

    @field_validator("images")
    @classmethod
    def _images_normalize(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return []
        if len(value) > MAX_IMAGES:
            raise ValueError(f"最多上传 {MAX_IMAGES} 张图片")
        return [normalize_data_uri(item) for item in value]


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
    images: list[str] = []

    @field_validator("images", mode="before")
    @classmethod
    def _images_not_none(cls, value):
        return [] if value is None else value


class RecordCreate(RecordBase):
    @field_validator("images")
    @classmethod
    def _images_normalize(cls, value: list[str]) -> list[str]:
        if len(value) > MAX_IMAGES:
            raise ValueError(f"最多上传 {MAX_IMAGES} 张图片")
        return [normalize_data_uri(item) for item in value]


class RecordUpdate(BaseModel):
    date: Optional[str] = Field(default=None, pattern=DATE_RE)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    is_completed: Optional[bool] = None
    category: Optional[str] = None
    linked_plan_id: Optional[int] = None
    images: Optional[list[str]] = None

    @field_validator("images")
    @classmethod
    def _images_normalize(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return []
        if len(value) > MAX_IMAGES:
            raise ValueError(f"最多上传 {MAX_IMAGES} 张图片")
        return [normalize_data_uri(item) for item in value]


class RecordOut(RecordBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # manual（自己记的）/ plan（计划勾选完成后自动生成）
    source: str = "manual"
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
    cancelled_plans: int
    # 完成率只看「自己新建的计划」与「记一笔」，这两组数字就是它的分子分母
    self_plans: int
    self_done_plans: int
    records_count: int
    done_records: int
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
    # 完成率与今日页同口径：自建计划（不含课表）+ 记一笔
    self_plans: int
    self_done_plans: int
    done_records: int
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


def _normalize_b64url(value: str, field: str, expected_bytes: int) -> str:
    """把 p256dh/auth 规范化为无填充的 urlsafe base64，并校验解码后字节数。"""
    if not value or len(value) > 1024:
        raise ValueError(f"{field} 格式不正确")
    # 允许标准 base64（含 + / =）或 urlsafe base64（含 - _）
    padded = value.strip().replace("-", "+").replace("_", "/")
    padded += "=" * (-len(padded) % 4)
    try:
        decoded = base64.b64decode(padded, validate=True)
    except Exception as exc:
        raise ValueError(f"{field} 不是合法的 Base64") from exc
    if len(decoded) != expected_bytes:
        raise ValueError(f"{field} 长度应为 {expected_bytes} 字节")
    return base64.urlsafe_b64encode(decoded).rstrip(b"=").decode("ascii")


class PushKeys(BaseModel):
    p256dh: str
    auth: str

    @field_validator("p256dh")
    @classmethod
    def _p256dh(cls, value: str) -> str:
        return _normalize_b64url(value, "p256dh", 65)

    @field_validator("auth")
    @classmethod
    def _auth(cls, value: str) -> str:
        return _normalize_b64url(value, "auth", 16)


class PushSubscriptionIn(BaseModel):
    endpoint: str = Field(..., max_length=800)
    keys: PushKeys
    user_agent: Optional[str] = Field(default=None, max_length=255)

    @field_validator("endpoint")
    @classmethod
    def _endpoint(cls, value: str) -> str:
        if not value.startswith(("https://", "http://localhost")):
            raise ValueError("订阅端点必须使用 HTTPS")
        return value.strip()


class PushSubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    endpoint: str
    created_at: datetime


class PushUnsubscribeIn(BaseModel):
    endpoint: str = Field(..., max_length=800)


class PushSendOut(BaseModel):
    success: int
    failed: int


class PushStatusOut(BaseModel):
    server_supported: bool
    subscriptions: int
    public_key: str


class PushScheduleIn(BaseModel):
    enabled: bool = False
    recurrence: Literal["daily", "weekly", "monthly", "yearly"] = "daily"
    times: list[str] = Field(default_factory=list)
    days_of_week: list[int] = Field(default_factory=list)
    day_of_month: list[int] = Field(default_factory=list)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    day: Optional[int] = Field(default=None, ge=1, le=31)
    batch_days: int = Field(default=0, ge=0, le=31)

    @field_validator("times", mode="before")
    @classmethod
    def _times(cls, value: Optional[list[str]]) -> list[str]:
        if value is None:
            value = []
        cleaned: list[str] = []
        for item in value:
            item = item.strip()
            if not re.fullmatch(TIME_RE, item):
                raise ValueError("时间点格式应为 HH:MM (00:00-23:59)")
            if item not in cleaned:
                cleaned.append(item)
        if not cleaned:
            raise ValueError("至少需要设置一个时间点")
        return sorted(cleaned)

    @field_validator("days_of_week", mode="before")
    @classmethod
    def _dow(cls, value: Optional[list[int]]) -> list[int]:
        if value is None:
            value = []
        cleaned = sorted({v for v in value})
        if any(v < 0 or v > 6 for v in cleaned):
            raise ValueError("星期取值应为 0-6")
        return cleaned

    @field_validator("day_of_month", mode="before")
    @classmethod
    def _dom(cls, value: Optional[list[int]]) -> list[int]:
        if value is None:
            value = []
        cleaned = sorted({v for v in value})
        if any(v < 1 or v > 31 for v in cleaned):
            raise ValueError("每月日期取值应为 1-31")
        return cleaned

    @model_validator(mode="after")
    def _recurrence_consistency(self) -> "PushScheduleIn":
        if self.recurrence == "weekly" and not self.days_of_week:
            raise ValueError("每周提醒需要选择星期")
        if self.recurrence == "monthly" and not self.day_of_month:
            raise ValueError("每月提醒需要选择日期")
        if self.recurrence == "yearly" and (self.month is None or self.day is None):
            raise ValueError("每年提醒需要选择月和日")
        return self


class PushScheduleOut(PushScheduleIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    last_fired_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class PushScheduleView(BaseModel):
    exists: bool
    schedule: Optional[PushScheduleOut] = None
    next_fire: Optional[str] = None
    preview: Optional[str] = None


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(default="", max_length=5000)
    level: Literal["info", "important"] = "info"


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: str
    level: str
    created_at: datetime


class AnnouncementAdminOut(AnnouncementOut):
    created_by_name: Optional[str] = None
    read_count: int = 0
    user_count: int = 0
