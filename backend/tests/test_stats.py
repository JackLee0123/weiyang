from datetime import date


TODAY = date.today().isoformat()


def test_stats_overview(client, auth_headers):
    client.post(
        "/api/plans",
        json={"date": TODAY, "title": "a", "status": "done", "start_time": "09:00", "end_time": "10:00"},
        headers=auth_headers,
    )
    client.post(
        "/api/plans",
        json={"date": TODAY, "title": "b", "start_time": "11:00", "end_time": "11:30"},
        headers=auth_headers,
    )
    client.post(
        "/api/records",
        json={"date": TODAY, "title": "r", "duration_minutes": 20, "category": "学习"},
        headers=auth_headers,
    )

    response = client.get("/api/stats/overview", params={"start": TODAY, "end": TODAY}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_plans"] == 2
    assert data["done_plans"] == 1
    assert data["completion_rate"] == 0.5
    assert data["planned_minutes"] == 90
    assert data["recorded_minutes"] == 20
    assert data["by_category"] == {"学习": 1}
    assert data["days"][0]["records_count"] == 1
