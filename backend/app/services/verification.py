from __future__ import annotations

import secrets
import time
from dataclasses import dataclass


class ResendTooSoonError(Exception):
    """同一邮箱在冷却期内重复请求验证码。"""


@dataclass
class _CodeRecord:
    code: str
    expires_at: float
    last_sent_at: float


_codes: dict[str, _CodeRecord] = {}


def _key(purpose: str, email: str) -> str:
    return f"{purpose}:{email}"


def request_code(purpose: str, email: str, ttl_seconds: int = 600, cooldown_seconds: int = 60) -> str:
    now = time.time()
    # 顺手清理已过期的记录，避免内存累积。
    expired = [k for k, v in _codes.items() if v.expires_at <= now]
    for k in expired:
        _codes.pop(k, None)

    key = _key(purpose, email)
    record = _codes.get(key)
    if record and now - record.last_sent_at < cooldown_seconds:
        remaining = max(1, round(cooldown_seconds - (now - record.last_sent_at)))
        raise ResendTooSoonError(f"验证码发送过于频繁，请 {remaining} 秒后再试")

    code = f"{secrets.randbelow(1_000_000):06d}"
    _codes[key] = _CodeRecord(code=code, expires_at=now + ttl_seconds, last_sent_at=now)
    return code


def consume_code(purpose: str, email: str, code: str) -> bool:
    key = _key(purpose, email)
    record = _codes.get(key)
    if not record:
        return False
    if time.time() > record.expires_at:
        _codes.pop(key, None)
        return False
    if secrets.compare_digest(record.code, code.strip()):
        _codes.pop(key, None)
        return True
    return False


def reset() -> None:
    """清空所有验证码（测试隔离用）。"""
    _codes.clear()
