import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, repository, schemas
from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import now_utc
from ..services.net import client_ip
from ..services.ratelimit import rate_limiter
from ..services.security import hash_token, new_token

router = APIRouter(prefix="/api/devices", tags=["devices"])

PAIR_CODE_TTL_SECONDS = 300


def _gen_pair_code(db: Session) -> str:
    """生成未被占用的 6 位数字配对码。"""
    for _ in range(20):
        code = f"{secrets.randbelow(1000000):06d}"
        exists = db.scalar(select(models.DevicePairCode.id).where(models.DevicePairCode.code == code))
        if exists is None:
            return code
    raise HTTPException(status_code=500, detail="配对码生成失败，请重试")


@router.post("/pair-codes", response_model=schemas.DevicePairCodeOut)
def create_pair_code(
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """网页端（已登录）生成配对码：短时效、一次性，换新码时作废同账号旧码。"""
    if not rate_limiter.allow(f"devices:pair-codes:{current_user.id}", limit=10, window_seconds=300):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")

    stale = db.scalars(
        select(models.DevicePairCode).where(
            models.DevicePairCode.user_id == current_user.id,
            models.DevicePairCode.consumed_at.is_(None),
            models.DevicePairCode.expires_at > now_utc(),
        )
    ).all()
    for item in stale:
        item.consumed_at = now_utc()

    code = _gen_pair_code(db)
    db.add(
        models.DevicePairCode(
            code=code,
            user_id=current_user.id,
            expires_at=now_utc() + timedelta(seconds=PAIR_CODE_TTL_SECONDS),
        )
    )
    db.commit()
    return schemas.DevicePairCodeOut(code=code, expires_in=PAIR_CODE_TTL_SECONDS)


@router.post("/pair", response_model=schemas.DevicePairOut)
def pair_device(data: schemas.DevicePairIn, request: Request, db: Session = Depends(get_db)):
    """手环端凭配对码换取访问令牌。码一次性使用，校验失败不提示码是否存在。"""
    if not rate_limiter.allow(f"devices:pair:ip:{client_ip(request)}", limit=20, window_seconds=600):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")

    record = db.scalar(select(models.DevicePairCode).where(models.DevicePairCode.code == data.code))
    invalid = (
        record is None
        or record.consumed_at is not None
        or record.expires_at <= now_utc()
    )
    if invalid:
        raise HTTPException(status_code=400, detail="配对码错误或已过期")

    user = db.get(models.User, record.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="配对码错误或已过期")

    # 原子性消费：并发下只放行第一个请求。
    record.consumed_at = now_utc()
    db.commit()

    token = new_token()
    expires_in = settings.auth_token_ttl_seconds
    repository.create_auth_token(
        db,
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=now_utc() + timedelta(seconds=expires_in),
    )
    return schemas.DevicePairOut(token=token, expires_in=expires_in, name=user.name, email=user.email)
