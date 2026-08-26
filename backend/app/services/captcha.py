from __future__ import annotations

import base64
import colorsys
import io
import random
import secrets
import time
from dataclasses import dataclass

from PIL import Image, ImageDraw

from ..config import settings


# 逻辑尺寸（前端需按此坐标系换算，不要直接依赖显示分辨率）
CAPTCHA_WIDTH = 300
CAPTCHA_HEIGHT = 150
PIECE_SIZE = 52
BUMP_RADIUS = 13
TOLERANCE = 10
CAPTCHA_TTL_SECONDS = 300
TOKEN_TTL_SECONDS = 180


@dataclass
class _Challenge:
    target_x: int
    piece_y: int
    expires_at: float
    used: bool = False


_challenges: dict[str, _Challenge] = {}
_tokens: dict[str, float] = {}


def _color_pair() -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    h = random.random()
    c1 = colorsys.hsv_to_rgb(h, 0.5, 0.88)
    c2 = colorsys.hsv_to_rgb((h + 0.2) % 1.0, 0.55, 0.6)
    return tuple(int(v * 255) for v in c1), tuple(int(v * 255) for v in c2)


def _lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _background(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> Image.Image:
    w, h = CAPTCHA_WIDTH, CAPTCHA_HEIGHT
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        draw.line([(0, y), (w, y)], fill=_lerp(c1, c2, y / h))

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    rng = random.Random()
    for _ in range(5):
        cx, cy, rad = rng.randint(0, w), rng.randint(0, h), rng.randint(14, 42)
        od.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(255, 255, 255, rng.randint(30, 80)))
    for _ in range(3):
        x0, y0 = rng.randint(0, w), rng.randint(0, h)
        x1, y1 = rng.randint(0, w), rng.randint(0, h)
        od.line([x0, y0, x1, y1], fill=(0, 0, 0, rng.randint(20, 50)), width=rng.randint(2, 5))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def _piece_mask() -> Image.Image:
    """拼图块掩码：圆角方块 + 右侧凸出的圆钮。"""
    r = BUMP_RADIUS
    p = PIECE_SIZE
    mask = Image.new("L", (p + r, p), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, p, p], radius=8, fill=255)
    draw.ellipse([p - r, p // 2 - r, p + r, p // 2 + r], fill=255)
    return mask


def _to_b64(img: Image.Image, fmt: str) -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _cleanup() -> None:
    now = time.time()
    for key, ch in list(_challenges.items()):
        if ch.expires_at <= now:
            _challenges.pop(key, None)
    for key, exp in list(_tokens.items()):
        if exp <= now:
            _tokens.pop(key, None)


def create_captcha() -> dict:
    c1, c2 = _color_pair()
    bg = _background(c1, c2)
    mask = _piece_mask()

    p = PIECE_SIZE
    r = BUMP_RADIUS
    pw = p + r
    target_x = random.randint(12, CAPTCHA_WIDTH - pw - 12)
    piece_y = random.randint(12, CAPTCHA_HEIGHT - p - 12)

    piece = bg.crop((target_x, piece_y, target_x + pw, piece_y + p))
    piece.putalpha(mask)

    # 在背景上挖出缺口（半透明暗色，方便看出对齐位置）
    bg_rgba = bg.convert("RGBA")
    hole = Image.new("RGBA", bg_rgba.size, (0, 0, 0, 0))
    hole.paste(Image.new("RGBA", (pw, p), (0, 0, 0, 150)), (target_x, piece_y), mask)
    bg_final = Image.alpha_composite(bg_rgba, hole).convert("RGB")

    captcha_id = secrets.token_urlsafe(16)
    _challenges[captcha_id] = _Challenge(target_x, piece_y, time.time() + CAPTCHA_TTL_SECONDS)
    _cleanup()

    return {
        "captcha_id": captcha_id,
        "background": _to_b64(bg_final, "PNG"),
        "piece": _to_b64(piece, "PNG"),
        "piece_y": piece_y,
        "piece_width": pw,
        "piece_height": p,
        "width": CAPTCHA_WIDTH,
        "height": CAPTCHA_HEIGHT,
        # 仅开发模式下回显答案，方便前端/测试联调；生产环境永不下发。
        "target_x": target_x if settings.dev_mode else None,
    }


def verify(captcha_id: str, x: float) -> str | None:
    ch = _challenges.get(captcha_id)
    if not ch or ch.used:
        return None
    if time.time() > ch.expires_at:
        _challenges.pop(captcha_id, None)
        return None
    if abs(x - ch.target_x) > TOLERANCE:
        return None
    ch.used = True
    _challenges.pop(captcha_id, None)
    token = secrets.token_urlsafe(24)
    _tokens[token] = time.time() + TOKEN_TTL_SECONDS
    _cleanup()
    return token


def is_token_valid(token: str) -> bool:
    """校验拼图凭证是否有效（不消费；有效期内可复用于本次注册）。"""
    exp = _tokens.get(token)
    if exp is None:
        return False
    if time.time() > exp:
        _tokens.pop(token, None)
        _cleanup()
        return False
    return True


def reset() -> None:
    _challenges.clear()
    _tokens.clear()
