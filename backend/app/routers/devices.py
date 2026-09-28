"""设备连接（手环/手表）。

方向是「设备发起」：手环端（未登录）调用 ``POST /api/devices/handshake`` 拿到一个
一次性短码，把短码显示成二维码；手机端（已登录）扫码确认后，手环凭 poll_token
轮询领取访问令牌。手表上没有键盘输入环节，也不用把令牌从浏览器抄到手表上。
"""

import secrets
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from .. import models, repository, schemas
from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import now_utc
from ..services import watchapp as watchapp_service
from ..services.net import client_ip
from ..services.ratelimit import rate_limiter
from ..services.security import hash_token, new_token

router = APIRouter(prefix="/api/devices", tags=["devices"])

# 二维码有效期：太短来不及扫，太长会让旧码堆积。
HANDSHAKE_TTL_SECONDS = 300
# 逾期多久后清理握手记录（留着便于排查，又不会无限增长）。
HANDSHAKE_RETENTION_SECONDS = 3600
# 循环轮询与短码校验的限流阈值。
POLL_LIMIT_PER_10MIN = 1200


def _gen_code(db: Session) -> str:
    """生成未被占用的 6 位数字短码。"""
    for _ in range(20):
        code = f"{secrets.randbelow(1000000):06d}"
        exists = db.scalar(select(models.DeviceHandshake.id).where(models.DeviceHandshake.code == code))
        if exists is None:
            return code
    raise HTTPException(status_code=500, detail="连接码生成失败，请重试")


def _gen_poll_token(db: Session) -> str:
    """生成手环专用的轮询凭据，别人拿到短码也无法冒领令牌。"""
    for _ in range(20):
        token = new_token()
        exists = db.scalar(
            select(models.DeviceHandshake.id).where(models.DeviceHandshake.poll_token_hash == hash_token(token))
        )
        if exists is None:
            return token
    raise HTTPException(status_code=500, detail="连接码生成失败，请重试")


def _cleanup(db: Session) -> None:
    cutoff = now_utc() - timedelta(seconds=HANDSHAKE_RETENTION_SECONDS)
    stale = db.scalars(select(models.DeviceHandshake).where(models.DeviceHandshake.expires_at < cutoff)).all()
    for item in stale:
        db.delete(item)
    if stale:
        db.commit()


def _load(db: Session, code: str) -> models.DeviceHandshake:
    record = db.scalar(select(models.DeviceHandshake).where(models.DeviceHandshake.code == code))
    if record is None:
        raise HTTPException(status_code=404, detail="连接码不存在，请在手环上重新生成")
    return record


def _status_of(record: models.DeviceHandshake) -> str:
    if record.claimed_at is not None:
        return "claimed"
    if record.expires_at <= now_utc():
        return "expired"
    if record.approved_at is not None:
        return "approved"
    return "pending"


def _remaining(record: models.DeviceHandshake) -> int:
    return max(0, int((record.expires_at - now_utc()).total_seconds()))


def _device_label(record: models.DeviceHandshake) -> str:
    return record.device_label or "手环"


def _current_token_hash(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return hash_token(token.strip())


@router.post("/handshake", response_model=schemas.DeviceHandshakeStartOut)
def start_handshake(
    request: Request,
    data: Optional[schemas.DeviceHandshakeStartIn] = None,
    db: Session = Depends(get_db),
):
    """手环端（未登录）发起连接：返回短码 + 轮询凭据。"""
    if not rate_limiter.allow(f"devices:handshake:ip:{client_ip(request)}", limit=30, window_seconds=600):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")

    _cleanup(db)

    code = _gen_code(db)
    poll_token = _gen_poll_token(db)
    db.add(
        models.DeviceHandshake(
            code=code,
            poll_token_hash=hash_token(poll_token),
            device_label=(data.device_label or "").strip()[:80] if data else "",
            status="pending",
            expires_at=now_utc() + timedelta(seconds=HANDSHAKE_TTL_SECONDS),
        )
    )
    db.commit()
    return schemas.DeviceHandshakeStartOut(
        code=code,
        poll_token=poll_token,
        expires_in=HANDSHAKE_TTL_SECONDS,
    )


@router.get("/handshake/{code}", response_model=schemas.DeviceHandshakeInfoOut)
def handshake_info(
    code: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """手机端扫码后先看一眼：这是哪台设备、状态如何、还剩多久。"""
    if not rate_limiter.allow(f"devices:handshake-info:{current_user.id}", limit=60, window_seconds=600):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")

    record = _load(db, code)
    return schemas.DeviceHandshakeInfoOut(
        code=record.code,
        device_label=_device_label(record),
        status=_status_of(record),
        expires_in=_remaining(record),
    )


@router.post("/handshake/{code}/approve", response_model=schemas.DeviceHandshakeInfoOut)
def approve_handshake(
    code: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """手机端（已登录）确认：把这台手环绑定到当前账号。"""
    if not rate_limiter.allow(f"devices:approve:{current_user.id}", limit=30, window_seconds=600):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")

    record = _load(db, code)
    status = _status_of(record)
    if status == "expired":
        raise HTTPException(status_code=400, detail="连接码已过期，请在手环上重新生成")
    if status == "claimed":
        raise HTTPException(status_code=400, detail="这台手环已经连接完成")
    if status == "approved":
        if record.user_id == current_user.id:
            return schemas.DeviceHandshakeInfoOut(
                code=record.code,
                device_label=_device_label(record),
                status=status,
                expires_in=_remaining(record),
            )
        raise HTTPException(status_code=400, detail="这台手环已被其他账号确认")

    record.user_id = current_user.id
    record.status = "approved"
    record.approved_at = now_utc()
    db.commit()
    return schemas.DeviceHandshakeInfoOut(
        code=record.code,
        device_label=_device_label(record),
        status="approved",
        expires_in=_remaining(record),
    )


@router.post("/handshake/{code}/poll", response_model=schemas.DeviceHandshakePollOut)
def poll_handshake(
    code: str,
    data: schemas.DeviceHandshakePollIn,
    request: Request,
    db: Session = Depends(get_db),
):
    """手环端轮询：确认后一次性领取访问令牌。"""
    if not rate_limiter.allow(
        f"devices:poll:ip:{client_ip(request)}", limit=POLL_LIMIT_PER_10MIN, window_seconds=600
    ):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")

    record = db.scalar(select(models.DeviceHandshake).where(models.DeviceHandshake.code == code))
    if record is None:
        return schemas.DeviceHandshakePollOut(status="invalid")
    if not secrets.compare_digest(record.poll_token_hash, hash_token(data.poll_token)):
        raise HTTPException(status_code=400, detail="连接凭据无效")

    status = _status_of(record)
    if status != "approved":
        return schemas.DeviceHandshakePollOut(status=status, device_label=_device_label(record))

    user = db.get(models.User, record.user_id) if record.user_id else None
    if user is None or not user.is_active:
        return schemas.DeviceHandshakePollOut(status="invalid")

    # 先标记领取再签发，避免并发轮询重复拿到令牌。
    record.claimed_at = now_utc()
    record.status = "claimed"
    db.commit()

    token = new_token()
    expires_in = settings.auth_token_ttl_seconds
    repository.create_auth_token(
        db,
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=now_utc() + timedelta(seconds=expires_in),
        device_kind="watch",
        device_label=_device_label(record),
    )
    return schemas.DeviceHandshakePollOut(
        status="approved",
        token=token,
        expires_in=expires_in,
        name=user.name,
        email=user.email,
        device_label=_device_label(record),
    )


@router.get("", response_model=list[schemas.DeviceOut])
def list_devices(
    authorization: Optional[str] = Header(default=None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """当前账号已连接的设备（手环 + 浏览器登录）。"""
    current_hash = _current_token_hash(authorization)
    tokens = db.scalars(
        select(models.AuthToken)
        .where(models.AuthToken.user_id == current_user.id, models.AuthToken.expires_at > now_utc())
        .order_by(models.AuthToken.created_at.desc())
    ).all()
    return [
        schemas.DeviceOut(
            id=item.id,
            device_kind=item.device_kind or "web",
            device_label=item.device_label,
            created_at=item.created_at,
            expires_at=item.expires_at,
            is_current=current_hash is not None and item.token_hash == current_hash,
        )
        for item in tokens
    ]


@router.delete("/{device_id}", status_code=204)
def revoke_device(
    device_id: int,
    authorization: Optional[str] = Header(default=None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """解绑设备：吊销对应访问令牌，手环下次请求会提示重新连接。"""
    token = db.scalar(
        select(models.AuthToken).where(
            models.AuthToken.id == device_id,
            models.AuthToken.user_id == current_user.id,
        )
    )
    if token is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    if token.token_hash == _current_token_hash(authorization):
        raise HTTPException(status_code=400, detail="不能解绑当前正在使用的设备")
    db.delete(token)
    db.commit()
    return Response(status_code=204)


@router.get("/watchapp/status")
def watchapp_build_status(current_user=Depends(get_current_user)):
    """服务端是否具备打手环安装包的条件（前端据此显示/隐藏按钮）。"""
    available, reason = watchapp_service.toolchain_status()
    return {"available": available, "reason": reason}


@router.post("/watchapp/build")
def build_watchapp(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """用当前账号的课表打一个手环安装包，直接下载。

    手环 10 的快应用不能联网，课表只能随包带进去，所以这一步是「服务端替你跑
    一次 npm run sync + aiot build」，出来的 rpk 下载后用 AstroBox 推到手环即可。
    """
    available, reason = watchapp_service.toolchain_status()
    if not available:
        raise HTTPException(status_code=503, detail=reason)

    if not rate_limiter.allow(
        f"watchapp:build:{current_user.id}",
        settings.watchapp_build_limit,
        settings.watchapp_build_window_seconds,
    ):
        raise HTTPException(status_code=429, detail="打包太频繁了，请稍后再试")

    try:
        rpk_path = watchapp_service.build_for_user(db, current_user)
    except watchapp_service.WatchAppBuildError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return FileResponse(
        rpk_path,
        media_type="application/octet-stream",
        filename=watchapp_service.download_name(current_user),
        # 响应发完再删临时目录，避免下载到一半文件就没了。
        background=BackgroundTask(watchapp_service.cleanup, rpk_path),
    )
