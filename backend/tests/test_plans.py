from datetime import date, timedelta

from app import repository


TODAY = date.today().isoformat()
PAST = (date.today() - timedelta(days=1)).isoformat()
FUTURE = (date.today() + timedelta(days=1)).isoformat()


def test_create_and_list_plan(client, auth_headers):
    payload = {"date": FUTURE, "title": "写周报", "priority": "high", "category": "工作"}
    response = client.post("/api/plans", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] > 0
    assert data["status"] == "pending"
    assert data["priority"] == "high"
    assert data["category"] == "工作"

    listed = client.get("/api/plans", headers=auth_headers).json()
    assert len(listed) == 1
    assert listed[0]["title"] == "写周报"


def test_update_and_delete_plan(client, auth_headers):
    plan = client.post("/api/plans", json={"date": FUTURE, "title": "a"}, headers=auth_headers).json()
    pid = plan["id"]

    updated = client.patch(f"/api/plans/{pid}", json={"status": "done", "priority": "low"}, headers=auth_headers).json()
    assert updated["status"] == "done"
    assert updated["priority"] == "low"

    assert client.delete(f"/api/plans/{pid}", headers=auth_headers).status_code == 204
    assert client.get("/api/plans", headers=auth_headers).json() == []


def test_plan_validation(client, auth_headers):
    assert client.post("/api/plans", json={"date": FUTURE, "title": ""}, headers=auth_headers).status_code == 422
    assert client.post("/api/plans", json={"date": "bad", "title": "x"}, headers=auth_headers).status_code == 422
    assert client.patch("/api/plans/9999", json={"title": "x"}, headers=auth_headers).status_code == 404


def test_cannot_create_plan_in_past(client, auth_headers):
    response = client.post("/api/plans", json={"date": PAST, "title": "x"}, headers=auth_headers)
    assert response.status_code == 403


def test_cannot_move_plan_to_past(client, auth_headers):
    plan = client.post("/api/plans", json={"date": TODAY, "title": "a"}, headers=auth_headers).json()
    response = client.patch(f"/api/plans/{plan['id']}", json={"date": PAST}, headers=auth_headers)
    assert response.status_code == 403


def test_cannot_edit_or_delete_frozen_past_plan(client, monkeypatch, auth_headers):
    # 先把“今天”冻结到过去日期，得以创建计划，再把“今天”推进，让该计划变成历史。
    monkeypatch.setattr(repository, "today_iso", lambda: PAST)
    plan = client.post("/api/plans", json={"date": PAST, "title": "a"}, headers=auth_headers).json()

    monkeypatch.setattr(repository, "today_iso", lambda: TODAY)
    assert client.patch(f"/api/plans/{plan['id']}", json={"title": "b"}, headers=auth_headers).status_code == 403
    assert client.delete(f"/api/plans/{plan['id']}", headers=auth_headers).status_code == 403


def test_plans_are_isolated_per_user(client, auth_headers, register_user):
    other_headers = register_user("other@example.com")
    owner_plan = client.post("/api/plans", json={"date": FUTURE, "title": "owner"}, headers=auth_headers).json()
    client.post("/api/plans", json={"date": FUTURE, "title": "other"}, headers=other_headers)

    assert [p["id"] for p in client.get("/api/plans", headers=auth_headers).json()] == [owner_plan["id"]]
    assert client.get(f"/api/plans/{owner_plan['id']}", headers=other_headers).status_code == 404
    assert client.patch(f"/api/plans/{owner_plan['id']}", json={"title": "x"}, headers=other_headers).status_code == 404
    assert client.delete(f"/api/plans/{owner_plan['id']}", headers=other_headers).status_code == 404


def test_requires_auth_to_access_plans(client):
    assert client.get("/api/plans").status_code == 401


def test_list_unfinished_plans(client, monkeypatch, auth_headers):
    past = (date.today() - timedelta(days=2)).isoformat()

    # 冻结“今天”到过去，得以创建历史计划
    monkeypatch.setattr(repository, "today_iso", lambda: past)
    client.post("/api/plans", json={"date": past, "title": "past-pending"}, headers=auth_headers)
    client.post("/api/plans", json={"date": past, "title": "past-done", "status": "done"}, headers=auth_headers)
    client.post("/api/plans", json={"date": past, "title": "past-cancelled", "status": "cancelled"}, headers=auth_headers)

    # 恢复正常“今天”，创建今天与未来计划
    monkeypatch.setattr(repository, "today_iso", lambda: date.today().isoformat())
    client.post("/api/plans", json={"date": TODAY, "title": "today-pending"}, headers=auth_headers)
    client.post("/api/plans", json={"date": TODAY, "title": "today-done", "status": "done"}, headers=auth_headers)
    client.post("/api/plans", json={"date": FUTURE, "title": "future-pending"}, headers=auth_headers)

    response = client.get("/api/plans/unfinished", headers=auth_headers)
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()]

    # 只保留“未完成 + 今天或过去”，排除完成/改道与未来计划，按日期升序
    assert titles == ["past-pending", "today-pending"]


def test_unfinished_requires_auth(client):
    assert client.get("/api/plans/unfinished").status_code == 401
