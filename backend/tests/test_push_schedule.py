from datetime import datetime

from app.database import get_db
from app.services import push_schedule as schedule_service


P256DH = "BNo0jm9JHia8ii_vLfL-ybz9cEFeQRlrMrmx7ZXwUkFFlIKhGNxx5L41fj7Jjxwlj2gfu51fp3MkYxb-1YYEPVE"
AUTH = "AAAAAAAAAAAAAAAAAAAAAA"


def _subscribe(client, headers):
    client.post(
        "/api/push/subscribe",
        json={
            "endpoint": "https://example.com/push/sched-device",
            "keys": {"p256dh": P256DH, "auth": AUTH},
        },
        headers=headers,
    )


def _valid_payload(recurrence="daily", **kw):
    payload = {
        "enabled": True,
        "recurrence": recurrence,
        "times": ["09:30", "21:00"],
        "days_of_week": [],
        "day_of_month": [],
        "month": None,
        "day": None,
        "batch_days": 1,
    }
    payload.update(kw)
    return payload


def test_schedule_requires_auth(client):
    assert client.get("/api/push/schedule").status_code == 401
    assert client.put("/api/push/schedule", json=_valid_payload()).status_code == 401


def test_schedule_default_is_empty(client, auth_headers):
    res = client.get("/api/push/schedule", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["exists"] is False


def test_schedule_save_and_read(client, auth_headers):
    res = client.put("/api/push/schedule", json=_valid_payload(), headers=auth_headers)
    assert res.status_code == 200
    saved = res.json()
    assert saved["recurrence"] == "daily"
    assert saved["times"] == ["09:30", "21:00"]
    assert saved["batch_days"] == 1

    view = client.get("/api/push/schedule", headers=auth_headers).json()
    assert view["exists"] is True
    assert view["next_fire"]


def test_schedule_validation(client, auth_headers):
    # 空时间点
    assert client.put("/api/push/schedule", json=_valid_payload(times=[]), headers=auth_headers).status_code == 422
    # 非法时间格式
    assert client.put("/api/push/schedule", json=_valid_payload(times=["25:99"]), headers=auth_headers).status_code == 422
    # 每周缺少星期
    assert (
        client.put("/api/push/schedule", json=_valid_payload(recurrence="weekly", days_of_week=[]), headers=auth_headers).status_code
        == 422
    )
    # 每月缺少日期
    assert (
        client.put("/api/push/schedule", json=_valid_payload(recurrence="monthly", day_of_month=[]), headers=auth_headers).status_code
        == 422
    )
    # 每年缺少月/日
    assert (
        client.put(
            "/api/push/schedule",
            json=_valid_payload(recurrence="yearly", month=None, day=None),
            headers=auth_headers,
        ).status_code
        == 422
    )


def test_process_due_sends_once(client, auth_headers, monkeypatch):
    _subscribe(client, auth_headers)
    today = datetime.now().strftime("%Y-%m-%d")
    client.post(
        "/api/plans",
        json={"date": today, "title": "提醒任务", "description": ""},
        headers=auth_headers,
    )
    now = datetime.now()
    client.put(
        "/api/push/schedule",
        json=_valid_payload(times=[now.strftime("%H:%M")], batch_days=0),
        headers=auth_headers,
    )

    calls = []

    def fake_send(db, user_id, title, body, url, **kw):
        calls.append((title, body, url))
        return {"success": 1, "failed": 0}

    monkeypatch.setattr("app.services.push_schedule.push_service.send_to_user", fake_send)

    override = client.app.dependency_overrides[get_db]
    gen = override()
    db = next(gen)
    try:
        schedule_service.process_due(db)
    finally:
        gen.close()

    assert len(calls) == 1
    assert calls[0][0] == "今日任务"
    assert calls[0][2] == "/notifications"
