from __future__ import annotations

import logging
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from html import escape
from typing import Optional

from ..config import settings


logger = logging.getLogger(__name__)

APP_NAME = settings.app_name
APP_TAGLINE = settings.app_tagline
BRAND_COLOR = "#0f766e"
BRAND_DARK = "#115e59"
BRAND_SOFT = "#ccfbf1"


class EmailSendError(Exception):
    """已配置 SMTP 但发送失败。"""


def is_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user)


def _sender() -> str:
    return settings.smtp_from or settings.smtp_user


def _ttl_minutes(ttl_seconds: int) -> str:
    return str(max(1, ttl_seconds // 60))


def _verification_plain(code: str, ttl_seconds: int, kind: str) -> str:
    is_reset = kind == "reset"
    action = "重置密码" if is_reset else "注册账号"
    greeting = (
        "你正在为未央 · Everlong 账号重置密码。"
        if is_reset
        else "欢迎注册未央 · Everlong，很高兴与你相遇。"
    )
    if is_reset:
        closing = (
            "如果你并未发起这次操作，请忽略本邮件，并尽快登录修改密码。\n"
            "为保障账号安全，请不要将验证码泄露给任何人。"
        )
    else:
        closing = (
            "如果你并未发起这次操作，请忽略本邮件。\n"
            "为保障账号安全，请不要将验证码泄露给任何人。"
        )
    return (
        f"{APP_NAME}\n"
        f"{APP_TAGLINE}\n\n"
        f"{greeting}\n\n"
        f"你的{action}验证码是：{code}\n\n"
        f"验证码 {_ttl_minutes(ttl_seconds)} 分钟内有效，请尽快完成验证。\n\n"
        f"{closing}\n\n"
        f"此邮件由 {APP_NAME} 自动发送，请勿直接回复。"
    )


def _verification_html(code: str, ttl_seconds: int, kind: str) -> str:
    is_reset = kind == "reset"
    action = "重置密码" if is_reset else "注册账号"
    greeting_html = (
        f"<strong>{APP_NAME}</strong> 账号重置密码。" if is_reset else f"欢迎注册 <strong>{APP_NAME}</strong>，很高兴与你相遇。"
    )
    hint_html = (
        "如果你并未发起这次操作，请忽略本邮件，并尽快登录修改密码。"
        if is_reset
        else "如果你并未发起这次操作，请忽略本邮件。"
    )
    return f"""
<div style="background:#f6f8fa;padding:24px 8px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;font-family:'PingFang SC','Microsoft YaHei',Arial,sans-serif;">
    <tr><td style="background:{BRAND_COLOR};padding:22px 28px;">
      <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0;">{APP_NAME}</div>
      <div style="font-size:12px;color:{BRAND_SOFT};margin-top:4px;">{APP_TAGLINE}</div>
    </td></tr>
    <tr><td style="padding:28px 28px 20px;">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:#0f172a;">{greeting_html}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#475569;">请在下方输入你的{action}验证码：</p>
      <div style="margin:18px 0;padding:18px 16px;background:#f0fdfa;border:1px dashed {BRAND_COLOR};border-radius:8px;text-align:center;">
        <div style="font-size:12px;color:{BRAND_DARK};margin-bottom:6px;">你的验证码</div>
        <div style="font-size:30px;font-weight:700;letter-spacing:8px;color:{BRAND_COLOR};line-height:1.2;">{escape(code)}</div>
      </div>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">验证码 <strong>{_ttl_minutes(ttl_seconds)} 分钟内有效</strong>，请尽快完成验证。</p>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#64748b;">{hint_html}</p>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
      <div style="font-size:12px;line-height:1.6;color:#64748b;">此邮件由 <strong>{APP_NAME}</strong> 自动发送，请勿直接回复。</div>
    </td></tr>
  </table>
</div>
""".strip()


def _build_verification_message(to_email: str, code: str, ttl_seconds: int, kind: str) -> EmailMessage:
    is_reset = kind == "reset"
    subject = f"{APP_NAME} · {'重置密码' if is_reset else '注册'}验证码"
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{_sender()}>"
    msg["To"] = to_email
    msg.set_content(_verification_plain(code, ttl_seconds, kind))
    msg.add_alternative(
        _verification_html(code, ttl_seconds, kind),
        subtype="html",
    )
    return msg


def _deliver(msg: EmailMessage) -> dict:
    """按配置的 SMTP 方式发送邮件，成功返回 delivered 标记。"""
    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
                if settings.smtp_starttls:
                    server.starttls(context=ssl.create_default_context())
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        return {"delivered": True}
    except Exception as exc:
        logger.exception("发送邮件到 %s 失败", msg["To"])
        raise EmailSendError(str(exc)) from exc


def send_verification_email(to_email: str, code: str, ttl_seconds: int, kind: str = "register") -> dict:
    """发送验证码邮件。未配置 SMTP 时进入开发模式，返回 dev_code 供联调。"""
    if not is_configured():
        logger.warning("SMTP 未配置，开发模式：%s 的 %s 验证码为 %s", kind, to_email, code)
        return {"delivered": False, "dev_code": code}

    msg = _build_verification_message(to_email, code, ttl_seconds, kind)
    return _deliver(msg)


def send_feedback_email(
    to_email: str,
    submitter_name: str,
    submitter_email: str,
    content: str,
    contact: str = "",
    attachments: Optional[list[tuple[str, bytes, str]]] = None,
) -> dict:
    """发送问题反馈邮件，可携带图片附件。未配置 SMTP 时抛错。"""
    if not is_configured():
        raise EmailSendError("SMTP 未配置，无法发送反馈")

    msg = EmailMessage()
    msg["Subject"] = f"{APP_NAME} · 问题反馈"
    msg["From"] = f"{settings.smtp_from_name} <{_sender()}>"
    msg["To"] = to_email

    lines = [
        f"来自：{submitter_name} <{submitter_email}>",
        f"时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    ]
    if contact:
        lines.append(f"联系方式：{contact}")
    lines.append("")
    lines.append("反馈内容：")
    lines.append(content)
    lines.append("")
    lines.append(f"附件图片：{len(attachments or [])} 张")
    msg.set_content("\n".join(lines))

    for filename, data, mimetype in attachments or []:
        maintype, _, subtype = mimetype.partition("/")
        msg.add_attachment(data, maintype=maintype or "image", subtype=subtype or "png", filename=filename)

    return _deliver(msg)
