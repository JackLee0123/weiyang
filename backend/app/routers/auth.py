from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import now_utc
from ..services import email
from ..services.email import EmailSendError
from ..services.security import hash_password, hash_token, new_token, verify_password
from ..services.verification import ResendTooSoonError, consume_code, request_code

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _issue_session(db: Session, user) -> schemas.AuthSessionOut:
    token = new_token()
    expires_in = settings.auth_token_ttl_seconds
    repository.create_auth_token(
        db,
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=now_utc() + timedelta(seconds=expires_in),
    )
    return schemas.AuthSessionOut(
        id=user.id,
        email=user.email,
        name=user.name,
        token=token,
        expires_in=expires_in,
    )


@router.post("/send-code", response_model=schemas.SendCodeOut)
def send_code(data: schemas.SendCodeIn):
    try:
        code = request_code(
            "register",
            data.email,
            ttl_seconds=settings.verify_code_ttl_seconds,
            cooldown_seconds=settings.verify_code_cooldown_seconds,
        )
    except ResendTooSoonError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    try:
        result = email.send_verification_email(
            data.email,
            code,
            ttl_seconds=settings.verify_code_ttl_seconds,
            kind="register",
        )
    except EmailSendError as exc:
        raise HTTPException(status_code=502, detail="邮件发送失败，请稍后重试或检查收件邮箱") from exc
    if not result["delivered"]:
        # 开发模式：SMTP 未配置，验证码随响应返回，便于本地联调。
        return schemas.SendCodeOut(
            message="验证码已生成（开发模式，未配置邮件服务）",
            expires_in=settings.verify_code_ttl_seconds,
            cooldown=settings.verify_code_cooldown_seconds,
            dev_code=result["dev_code"],
        )
    return schemas.SendCodeOut(
        message="验证码已发送到你的邮箱",
        expires_in=settings.verify_code_ttl_seconds,
        cooldown=settings.verify_code_cooldown_seconds,
    )


@router.post("/register", response_model=schemas.AuthSessionOut, status_code=201)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    if repository.get_user_by_email(db, data.email):
        raise HTTPException(status_code=409, detail="该邮箱已注册，请直接登录")
    if not consume_code("register", data.email, data.code):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    user = repository.create_user(
        db,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    return _issue_session(db, user)


@router.post("/login", response_model=schemas.AuthSessionOut)
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    user = repository.get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已停用，请联系管理员")
    return _issue_session(db, user)


@router.get("/me", response_model=schemas.AuthUserOut)
def me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/forgot-password", response_model=schemas.SendCodeOut)
def forgot_password(data: schemas.ForgotPasswordIn, db: Session = Depends(get_db)):
    if not repository.get_user_by_email(db, data.email):
        raise HTTPException(status_code=404, detail="该邮箱未注册")
    try:
        code = request_code(
            "reset",
            data.email,
            ttl_seconds=settings.verify_code_ttl_seconds,
            cooldown_seconds=settings.verify_code_cooldown_seconds,
        )
    except ResendTooSoonError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    try:
        result = email.send_verification_email(
            data.email,
            code,
            ttl_seconds=settings.verify_code_ttl_seconds,
            kind="reset",
        )
    except EmailSendError as exc:
        raise HTTPException(status_code=502, detail="邮件发送失败，请稍后重试或检查收件邮箱") from exc

    if not result["delivered"]:
        return schemas.SendCodeOut(
            message="重置验证码已生成（开发模式）",
            expires_in=settings.verify_code_ttl_seconds,
            cooldown=settings.verify_code_cooldown_seconds,
            dev_code=result["dev_code"],
        )
    return schemas.SendCodeOut(
        message="重置验证码已发送到你的邮箱",
        expires_in=settings.verify_code_ttl_seconds,
        cooldown=settings.verify_code_cooldown_seconds,
    )


@router.post("/reset-password", response_model=schemas.ResetPasswordOut)
def reset_password(data: schemas.ResetPasswordIn, db: Session = Depends(get_db)):
    user = repository.get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=404, detail="该邮箱未注册")
    if not consume_code("reset", data.email, data.code):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    user.password_hash = hash_password(data.password)
    db.commit()
    # 重置后吊销该账号所有已登录设备。
    repository.revoke_all_user_tokens(db, user.id)
    return schemas.ResetPasswordOut(message="密码已重置，请用新密码登录")


@router.post("/logout", status_code=204)
def logout(
    current_user=Depends(get_current_user),
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    # 先经由 get_current_user 校验令牌有效，再吊销该令牌。
    token = authorization.partition(" ")[2].strip() if authorization else ""
    if token:
        repository.revoke_token(db, hash_token(token))
    return None
