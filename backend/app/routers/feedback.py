from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from .. import schemas
from ..config import settings
from ..deps import get_current_user
from ..models import User
from ..services import email
from ..services.email import EmailSendError

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

MAX_IMAGES = 3
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_CONTENT_LENGTH = 5000


@router.post("", response_model=schemas.FeedbackOut)
def submit_feedback(
    content: str = Form(...),
    contact: str = Form(default=""),
    images: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
):
    text = content.strip()
    if not text:
        raise HTTPException(status_code=422, detail="请填写反馈内容")
    if len(text) > MAX_CONTENT_LENGTH:
        raise HTTPException(status_code=422, detail="反馈内容过长，请精简后再提交")
    if len(images) > MAX_IMAGES:
        raise HTTPException(status_code=422, detail=f"最多上传 {MAX_IMAGES} 张图片")

    attachments: list[tuple[str, bytes, str]] = []
    for image in images:
        data = image.file.read()
        if not data:
            continue
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=422, detail=f"图片 {image.filename} 超过 5MB")
        mimetype = image.content_type or "image/png"
        attachments.append((image.filename or "image", data, mimetype))

    to_email = settings.feedback_to_email or settings.smtp_user
    if not to_email:
        raise HTTPException(status_code=503, detail="暂未配置反馈邮箱，请联系开发者")

    try:
        email.send_feedback_email(
            to_email=to_email,
            submitter_name=current_user.name,
            submitter_email=current_user.email,
            content=text,
            contact=contact.strip(),
            attachments=attachments,
        )
    except EmailSendError as exc:
        raise HTTPException(status_code=502, detail="反馈提交失败，请稍后再试") from exc

    return schemas.FeedbackOut(submitted=True, message="感谢反馈，我们会认真查看")
