from __future__ import annotations

import logging
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from typing import Optional

from ..config import settings


logger = logging.getLogger(__name__)


class EmailSendError(Exception):
    """已配置 SMTP 但发送失败。"""


def is_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user)


def _sender() -> str:
    return settings.smtp_from or settings.smtp_user


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

    is_reset = kind == "reset"
    subject = "计划表重置密码验证码" if is_reset else "计划表注册验证码"
    leading = "你正在重置计划表的登录密码。" if is_reset else "感谢注册计划表。"
    closing = "如果不是你本人操作，请忽略这封邮件。" if not is_reset else "如果不是你本人操作，请忽略，并尽快登录修改密码。"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{_sender()}>"
    msg["To"] = to_email
    msg.set_content(
        f"{leading}\n\n你的验证码是：{code}\n"
        f"{ttl_seconds // 60} 分钟内有效，请勿泄露给他人。\n\n"
        f"{closing}"
    )

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
    msg["Subject"] = "计划表问题反馈"
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
