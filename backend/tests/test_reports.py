from datetime import date, timedelta

from app import repository


TODAY = date.today().isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()


def test_memory_report(client, monkeypatch, auth_headers):
    # 昨天的记录需要先冻结“今天”才能创建
    monkeypatch.setattr(repository, "today_iso", lambda: YESTERDAY)
    client.post(
        "/api/records",
        json={"date": YESTERDAY, "title": "r3", "duration_minutes": 10, "category": "工作"},
        headers=auth_headers,
    )

    monkeypatch.setattr(repository, "today_iso", lambda: TODAY)
    client.post("/api/plans", json={"date": TODAY, "title": "done", "status": "done"}, headers=auth_headers)
    client.post("/api/plans", json={"date": TODAY, "title": "pending"}, headers=auth_headers)
    client.post("/api/plans", json={"date": TODAY, "title": "cancelled", "status": "cancelled"}, headers=auth_headers)
    client.post(
        "/api/records",
        json={"date": TODAY, "title": "r1", "duration_minutes": 30, "category": "工作"},
        headers=auth_headers,
    )
    client.post(
        "/api/records",
        json={"date": TODAY, "title": "r2", "duration_minutes": 20, "category": "生活"},
        headers=auth_headers,
    )

    response = client.get("/api/reports/memory", params={"start": YESTERDAY, "end": TODAY}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["period_days"] == 2
    assert data["records_count"] == 3
    assert data["recorded_minutes"] == 60
    assert data["active_days"] == 2
    assert data["consecutive_recording_days"] == 2
    assert data["total_plans"] == 3
    assert data["done_plans"] == 1
    assert data["unfinished_plans"] == 1
    assert data["cancelled_plans"] == 1
    assert data["by_category"]["工作"] == 2
    assert data["by_category"]["生活"] == 1
    assert data["top_categories"] == ["工作", "生活"]
    assert data["busiest_day"] == TODAY
    assert [item["title"] for item in data["unfinished"]] == ["pending"]


def test_memory_report_empty(client, auth_headers):
    response = client.get(
        "/api/reports/memory", params={"start": "2020-01-01", "end": "2020-01-31"}, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["records_count"] == 0
    assert data["total_plans"] == 0
    assert data["unfinished"] == []


def test_memory_report_requires_auth(client):
    assert client.get("/api/reports/memory").status_code == 401
