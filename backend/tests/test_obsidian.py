"""Obsidian 同步：密钥生成/校验、笔记 upsert、富文本渲染、根目录约束。"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def _register_user() -> str:
    """走内部仓储直接建用户，返回登录 token。"""
    from app.database import SessionLocal
    from app import repository
    from app.services.security import hash_password

    db = SessionLocal()
    try:
        repository.create_user(db, "测试", "obs@example.com", hash_password("passw0rd!"))
    finally:
        db.close()
    # 登录接口需要验证码拼图，直接调内部逻辑签发 token 更稳定
    from datetime import timedelta
    from app.models import now_utc
    from app.services.security import new_token, hash_token

    db = SessionLocal()
    try:
        user = repository.get_user_by_email(db, "obs@example.com")
        token = new_token()
        repository.create_auth_token(
            db, user_id=user.id, token_hash=hash_token(token),
            expires_at=now_utc() + timedelta(hours=1),
        )
        return token
    finally:
        db.close()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_api_key_flow_and_sync():
    token = _register_user()

    # 生成密钥
    res = client.post("/api/obsidian/settings/api-key", headers=_auth(token))
    assert res.status_code == 200
    api_key = res.json()["api_key"]
    assert api_key.startswith("obsk_")

    # 设置同步根目录
    res = client.put("/api/obsidian/settings/root", headers=_auth(token), json={"sync_root": "日记"})
    assert res.status_code == 200

    # 目录外路径被拒绝
    res = client.post(
        "/api/obsidian/sync/note",
        headers={"X-Obsidian-Key": api_key},
        json={"path": "其他/a.md", "content": "# x"},
    )
    assert res.status_code == 403

    # 目录内路径同步成功，并渲染富文本
    res = client.post(
        "/api/obsidian/sync/note",
        headers={"X-Obsidian-Key": api_key},
        json={"path": "日记/2026-10-08.md", "content": "# 标题\n\n**加粗** <script>alert(1)</script>"},
    )
    assert res.status_code == 200
    assert res.json()["updated"] == 1

    # 重复内容跳过
    res = client.post(
        "/api/obsidian/sync/note",
        headers={"X-Obsidian-Key": api_key},
        json={"path": "日记/2026-10-08.md", "content": "# 标题\n\n**加粗** <script>alert(1)</script>"},
    )
    assert res.json()["skipped"] == 1

    # 网页端列表 + 富文本内容
    res = client.get("/api/obsidian/notes", headers=_auth(token))
    assert res.status_code == 200
    assert [n["path"] for n in res.json()] == ["日记/2026-10-08.md"]

    res = client.get("/api/obsidian/notes/content?path=日记/2026-10-08.md", headers=_auth(token))
    assert res.status_code == 200
    html = res.json()["content_html"]
    assert "<h1>" in html and "<strong>加粗</strong>" in html
    assert "<script>" not in html  # XSS 被消毒

    # 删除同步 → 列表消失
    res = client.post(
        "/api/obsidian/sync/delete",
        headers={"X-Obsidian-Key": api_key},
        json={"path": "日记/2026-10-08.md"},
    )
    assert res.status_code == 200
    res = client.get("/api/obsidian/notes", headers=_auth(token))
    assert res.json() == []

    # 错误密钥被拒绝
    res = client.get("/api/obsidian/sync/check", headers={"X-Obsidian-Key": "obsk_bad"})
    assert res.status_code == 401
