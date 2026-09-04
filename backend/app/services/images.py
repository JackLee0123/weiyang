from __future__ import annotations

import base64
import io
import re

from PIL import Image, ImageOps

MAX_IMAGES = 3
MAX_INPUT_BYTES = 8 * 1024 * 1024
MAX_DIMENSION = 1280
JPEG_QUALITY = 82

_DATA_URI_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp);base64,(?P<data>.+)$")


def normalize_data_uri(data_uri: str) -> str:
    """校验并压缩一张 base64 图片 data URI，返回归一化后的 data URI。

    校验失败时抛出 ValueError（中文提示），由 Pydantic 校验转成 422。
    """
    match = _DATA_URI_RE.match(data_uri)
    if not match:
        raise ValueError("图片格式不支持，仅支持 PNG/JPEG/WebP")
    try:
        content = base64.b64decode(match.group("data"), validate=True)
    except Exception as exc:
        raise ValueError("图片数据无效") from exc
    if not content:
        raise ValueError("图片数据为空")
    if len(content) > MAX_INPUT_BYTES:
        raise ValueError("单张图片过大，请压缩后再上传")

    try:
        with Image.open(io.BytesIO(content)) as img:
            img = ImageOps.exif_transpose(img)
            has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
            if has_alpha:
                if img.mode != "RGBA":
                    img = img.convert("RGBA")
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                mimetype = "image/png"
            else:
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
                mimetype = "image/jpeg"
    except Exception as exc:
        raise ValueError("图片无法解析") from exc

    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:{mimetype};base64,{payload}"
