from fastapi import APIRouter, HTTPException, Request

from .. import schemas
from ..services import captcha
from ..services.net import client_ip
from ..services.ratelimit import rate_limiter

router = APIRouter(prefix="/api/captcha", tags=["captcha"])


def _limit(request: Request, name: str, key: str, limit: int, window: int) -> None:
    if not rate_limiter.allow(f"captcha:{name}:{key}", limit, window):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")


@router.post("", response_model=schemas.CaptchaCreateOut)
def create_captcha(request: Request):
    _limit(request, "create", f"ip:{client_ip(request)}", limit=60, window=3600)
    return captcha.create_captcha()


@router.post("/verify", response_model=schemas.CaptchaVerifyOut)
def verify_captcha(data: schemas.CaptchaVerifyIn, request: Request):
    _limit(request, "verify", f"ip:{client_ip(request)}", limit=120, window=3600)
    token = captcha.verify(data.captcha_id, data.x)
    if not token:
        raise HTTPException(status_code=400, detail="拼图验证失败，请重试")
    return schemas.CaptchaVerifyOut(captcha_token=token)
