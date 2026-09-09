from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import User
from ..services.net import client_ip
from ..services.ratelimit import rate_limiter
from ..services import push as push_service
from ..services import push_schedule as schedule_service

router = APIRouter(prefix="/api/push", tags=["push"])


def _enforce(request: Request, name: str, key: str, limit: int, window: int) -> None:
    if not rate_limiter.allow(f"push:{name}:{key}", limit, window):
        raise HTTPException(status_code=429, detail="操作过于频繁，请稍后再试")


@router.get("/config")
def get_config():
    """前端订阅前读取的公钥与配置状态。

    VAPID 公钥可安全暴露给前端（浏览器订阅时使用 applicationServerKey），
    私钥绝不外泄。
    """
    return {
        "server_supported": push_service.server_supported(),
        "public_key": settings.vapid_public_key,
    }


@router.get("/status", response_model=schemas.PushStatusOut)
def get_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subs = repository.list_subscriptions(db, current_user.id)
    return schemas.PushStatusOut(
        server_supported=push_service.server_supported(),
        subscriptions=len(subs),
        public_key=settings.vapid_public_key,
    )


@router.post("/subscribe", response_model=schemas.PushSubscriptionOut, status_code=201)
def subscribe(
    data: schemas.PushSubscriptionIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _enforce(request, "subscribe", f"user:{current_user.id}", limit=20, window=60)
    if data.keys.p256dh == "" or data.keys.auth == "":
        raise HTTPException(status_code=422, detail="订阅密钥缺失")
    sub = repository.upsert_subscription(
        db,
        current_user.id,
        endpoint=data.endpoint,
        p256dh=data.keys.p256dh,
        auth=data.keys.auth,
        user_agent=data.user_agent,
    )
    return sub


@router.post("/unsubscribe", status_code=204)
def unsubscribe(
    data: schemas.PushUnsubscribeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repository.delete_subscription_by_endpoint(db, current_user.id, data.endpoint)
    return None


@router.post("/test", response_model=schemas.PushSendOut)
def send_test(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """开发/自助测试：给当前用户发送一条测试通知。"""
    _enforce(request, "test", f"user:{current_user.id}", limit=10, window=60)
    if not push_service.server_supported():
        raise HTTPException(status_code=503, detail="推送服务未配置，请在后端设置 VAPID 密钥")
    result = push_service.send_test(db, current_user.id)
    if result.success == 0:
        raise HTTPException(status_code=400, detail="当前设备尚未开启通知，请先在设置中开启")
    return result


@router.post("/send", response_model=schemas.PushSendOut)
def send(
    data: schemas.PushSendIn,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """发给指定用户（仅管理员）。支持标题、正文、图标与跳转 URL。"""
    _enforce(request, "send", f"admin:{admin.id}:ip:{client_ip(request)}", limit=30, window=60)
    if not push_service.server_supported():
        raise HTTPException(status_code=503, detail="推送服务未配置，请在后端设置 VAPID 密钥")
    if not repository.get_user(db, data.user_id):
        raise HTTPException(status_code=404, detail="用户不存在")
    return push_service.send_to_user(
        db,
        data.user_id,
        title=data.title,
        body=data.body,
        url=data.url,
        icon=data.icon,
    )


@router.get("/schedule", response_model=schemas.PushScheduleView)
def get_schedule(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedule = repository.get_push_schedule(db, current_user.id)
    if schedule is None:
        return schemas.PushScheduleView(exists=False)
    out = schemas.PushScheduleOut.model_validate(schedule)
    next_dt = schedule_service.next_fire(schedule, datetime.now())
    preview = schedule_service.build_content(schedule, db, current_user.id)
    return schemas.PushScheduleView(
        exists=True,
        schedule=out,
        next_fire=next_dt.isoformat() if next_dt else None,
        preview=(preview[0] + "：" + preview[1]) if preview else None,
    )


@router.put("/schedule", response_model=schemas.PushScheduleOut)
def update_schedule(
    data: schemas.PushScheduleIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.enabled and not push_service.server_supported():
        raise HTTPException(status_code=503, detail="推送服务未配置，请先设置 VAPID 密钥")
    schedule = repository.upsert_push_schedule(db, current_user.id, data)
    return schedule
