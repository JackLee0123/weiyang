from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import HTTPException
from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from .. import models, repository, schemas
from ..config import settings

logger = logging.getLogger(__name__)

DEFAULT_ICON = "/icons/icon-192.png"
DEFAULT_BADGE = "/icons/icon-192.png"
DEFAULT_TAG = "everlong"


def server_supported() -> bool:
    return settings.vapid_configured


def public_key() -> str:
    if not settings.vapid_public_key:
        raise HTTPException(status_code=503, detail="推送服务未配置，请联系管理员")
    return settings.vapid_public_key


def _payload(
    title: str,
    body: str,
    url: str = "/",
    icon: Optional[str] = None,
    badge: Optional[str] = None,
    tag: str = DEFAULT_TAG,
    data: Optional[dict] = None,
) -> dict:
    """构造发给 Service Worker 的 JSON 载荷（由 sw.js 读取并展示系统通知）。"""
    payload: dict = {
        "title": title,
        "body": body,
        "icon": icon or DEFAULT_ICON,
        "badge": badge or DEFAULT_BADGE,
        "tag": tag,
        "url": url or "/",
        "data": {"url": url or "/", **({"data": data} if data else {})},
    }
    return payload


def _send_one(db: Session, sub: models.PushSubscription, payload: dict) -> bool:
    """向单个订阅端点推送；订阅已失效（404/410）时自动清理，返回是否成功。"""
    if not settings.vapid_configured:
        raise HTTPException(status_code=503, detail="推送服务未配置，请联系管理员")
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=60,
            timeout=15,
        )
        return True
    except WebPushException as exc:
        if exc.status_code in (404, 410):
            # 订阅已过期 / 撤销，从数据库删除，避免持续重试失败端点。
            logger.info("Push subscription gone (%s), removing %s", exc.status_code, sub.endpoint)
            repository.delete_subscriptions(db, [sub])
            return False
        logger.warning("WebPush failed for %s: %s", sub.endpoint, exc)
        return False
    except Exception as exc:  # 网络 / 加密等异常，不影响其他订阅
        logger.warning("Push send error for %s: %s", sub.endpoint, exc)
        return False


def send_to_user(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    url: str = "/",
    icon: Optional[str] = None,
    badge: Optional[str] = None,
    tag: str = DEFAULT_TAG,
) -> schemas.PushSendOut:
    """向指定用户的所有设备推送，返回成功/失败数量。"""
    subs = repository.list_subscriptions(db, user_id)
    if not subs:
        return schemas.PushSendOut(success=0, failed=0)
    payload = _payload(title, body, url, icon, badge, tag)
    success = failed = 0
    for sub in subs:
        if _send_one(db, sub, payload):
            success += 1
        else:
            failed += 1
    return schemas.PushSendOut(success=success, failed=failed)


def send_test(db: Session, user_id: int) -> schemas.PushSendOut:
    return send_to_user(
        db,
        user_id,
        title="测试通知",
        body="你的 PWA 手机通知已经正常工作！",
        url="/notifications",
    )
