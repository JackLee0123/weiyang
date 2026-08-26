from datetime import date, timedelta


TODAY = date.today().isoformat()
TOMORROW = (date.today() + timedelta(days=1)).isoformat()


def test_heatmap_points(client, auth_headers):
    client.post("/api/plans", json={"date": TODAY, "title": "a", "status": "done"}, headers=auth_headers)
    client.post("/api/plans", json={"date": TODAY, "title": "b"}, headers=auth_headers)  # 待办，不计入完成
    client.post("/api/plans", json={"date": TOMORROW, "title": "c", "status": "done"}, headers=auth_headers)
    client.post("/api/records", json={"date": TODAY, "title": "r"}, headers=auth_headers)

    response = client.get("/api/stats/heatmap", params={"start": TODAY, "end": TOMORROW}, headers=auth_headers)
    assert response.status_code == 200
    by_date = {item["date"]: item for item in response.json()}

    assert by_date[TODAY]["completed_plans"] == 1
    assert by_date[TODAY]["records_count"] == 1
    assert by_date[TOMORROW]["completed_plans"] == 1
    assert by_date[TOMORROW]["records_count"] == 0


def test_heatmap_empty_range(client, auth_headers):
    response = client.get("/api/stats/heatmap", params={"start": "2026-01-01", "end": "2026-01-31"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []
