from __future__ import annotations

from fastapi import Request

from ..config import settings


def client_ip(request: Request) -> str:
    """获取客户端 IP；仅在信任反向代理时读取 X-Forwarded-For。"""
    if settings.trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"
