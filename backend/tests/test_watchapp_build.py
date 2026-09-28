"""手环安装包（离线快照）：接口与打包服务。

手环 10 的快应用不能联网，课表要随安装包带进去；这里验证服务端那条「点一下就
下载属于自己课表的 rpk」的链路。真正调 aiot build 的部分用假的构建函数替换，
免得测试依赖 Node 工具链。
"""

import json

from app.config import settings
from app.services import watchapp


def _fake_source(tmp_path):
    """搭一个最小的 watchapp 源码树，够 toolchain_status 判定为「可用」。"""
    root = tmp_path / "watchapp"
    (root / "src" / "common" / "data").mkdir(parents=True)
    (root / "node_modules" / ".bin").mkdir(parents=True)
    (root / "sign" / "debug").mkdir(parents=True)
    (root / "package.json").write_text("{}", encoding="utf-8")
    (root / "sign" / "debug" / "private.pem").write_text("key", encoding="utf-8")
    (root / "sign" / "debug" / "certificate.pem").write_text("cert", encoding="utf-8")
    return root


def test_status_hides_button_when_source_missing(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "watchapp_dir", str(tmp_path / "nope"))

    body = client.get("/api/devices/watchapp/status", headers=auth_headers).json()

    assert body["available"] is False
    assert body["reason"]


def test_build_reports_reason_when_toolchain_missing(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "watchapp_dir", str(tmp_path / "nope"))

    resp = client.post("/api/devices/watchapp/build", headers=auth_headers)

    assert resp.status_code == 503
    assert "watchapp" in resp.json()["detail"]


def test_build_requires_login(client):
    assert client.post("/api/devices/watchapp/build").status_code == 401


def test_status_available_with_source(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "watchapp_dir", str(_fake_source(tmp_path)))
    monkeypatch.setattr(watchapp, "_node_path", lambda: "node")

    body = client.get("/api/devices/watchapp/status", headers=auth_headers).json()

    assert body["available"] is True, body


def test_build_injects_own_timetable(client, auth_headers, tmp_path, monkeypatch):
    root = _fake_source(tmp_path)
    monkeypatch.setattr(settings, "watchapp_dir", str(root))
    monkeypatch.setattr(watchapp, "_node_path", lambda: "node")

    captured = {}

    def fake_build(project, source):
        captured["sync"] = (project / "src" / "common" / "data" / "sync.js").read_text(encoding="utf-8")
        captured["inside_source"] = source in project.parents
        captured["has_sign"] = (project / "sign" / "debug" / "private.pem").exists()
        dist = project / "dist"
        dist.mkdir(parents=True, exist_ok=True)
        (dist / "cn.everlong.watch.debug.1.1.0.rpk").write_bytes(b"rpk-bytes")

    monkeypatch.setattr(watchapp, "_run_build", fake_build)

    saved = client.post(
        "/api/timetable/courses",
        headers=auth_headers,
        json={
            "term": "2026-2027-1",
            "week1_date": "2026-08-31",
            "courses": [
                {
                    "term": "2026-2027-1",
                    "name": "高等数学",
                    "teacher": "张老师",
                    "location": "B202",
                    "day_of_week": 1,
                    "start_period": 1,
                    "end_period": 2,
                    "week_label": "1-16周",
                }
            ],
        },
    )
    assert saved.status_code == 200, saved.text

    resp = client.post("/api/devices/watchapp/build", headers=auth_headers)

    assert resp.status_code == 200, resp.text
    assert resp.content == b"rpk-bytes"
    assert "attachment" in resp.headers["content-disposition"]
    assert ".rpk" in resp.headers["content-disposition"]

    # 注入的 sync.js 必须是能直接 import 的模块，且带上这个账号自己的课表。
    payload = json.loads(captured["sync"].split("export default ", 1)[1])
    assert payload["timetable"]["settings"]["week1_date"] == "2026-08-31"
    assert [c["name"] for c in payload["timetable"]["courses"]] == ["高等数学"]
    assert payload["account"] == "主人"
    assert captured["inside_source"] is True
    assert captured["has_sign"] is True


def test_build_is_rate_limited(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "watchapp_dir", str(_fake_source(tmp_path)))
    monkeypatch.setattr(watchapp, "_node_path", lambda: "node")
    monkeypatch.setattr(settings, "watchapp_build_limit", 1)

    def fake_build(project, source):
        dist = project / "dist"
        dist.mkdir(parents=True, exist_ok=True)
        (dist / "a.rpk").write_bytes(b"x")

    monkeypatch.setattr(watchapp, "_run_build", fake_build)

    assert client.post("/api/devices/watchapp/build", headers=auth_headers).status_code == 200
    assert client.post("/api/devices/watchapp/build", headers=auth_headers).status_code == 429


def test_sync_js_is_importable_module():
    payload = {"synced_at": "x", "account": "主人", "timetable": {"settings": {}, "courses": []}}

    text = watchapp._sync_js(payload)

    assert "export default " in text
    assert json.loads(text.split("export default ", 1)[1]) == payload
