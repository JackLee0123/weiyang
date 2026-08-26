from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from . import repository
from .database import get_db
from .services.security import hash_token


def _extract_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="请先登录")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="登录凭证无效")
    return token.strip()


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _extract_token(authorization)
    user = repository.get_user_by_token(db, hash_token(token))
    if not user:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已停用")
    return user


def require_admin(current_user=Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return current_user
