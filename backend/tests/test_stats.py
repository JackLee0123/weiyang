from datetime import date, timedelta


TODAY = date.today().isoformat()


def _next_monday() -> date:
    today = date.today()
    return today - timedelta(days=today.isoweekday() - 1) + timedelta(weeks=1)


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
    # 完成率 = (已抵达的自建计划 + 已完成的记一笔) / 两者合计 = (1 + 1) / (2 + 1)
    assert data["self_plans"] == 2
    assert data["self_done_plans"] == 1
    assert data["records_count"] == 1
    assert data["done_records"] == 1
    assert data["completion_rate"] == 0.6667
    assert data["planned_minutes"] == 90
    assert data["recorded_minutes"] == 20
    assert data["by_category"] == {"学习": 1}
    # 热力图直接用 days 里的逐日聚合，这里锁定字段口径
    assert data["days"][0]["records_count"] == 1
    assert data["days"][0]["done_plans"] == 1
    assert data["consecutive_recording_days"] == 1


def test_planned_minutes_merge_overlap_and_skip_cancelled(client, auth_headers):
    """计划用时按天合并重叠时段，且改道（cancelled）的计划不计入。"""
    client.post(
        "/api/plans",
        json={"date": TODAY, "title": "a", "start_time": "09:00", "end_time": "10:00"},
        headers=auth_headers,
    )
    client.post(
        "/api/plans",
        json={"date": TODAY, "title": "b", "start_time": "09:30", "end_time": "11:00"},
        headers=auth_headers,
    )
    client.post(
        "/api/plans",
        json={"date": TODAY, "title": "c", "status": "cancelled", "start_time": "13:00", "end_time": "14:00"},
        headers=auth_headers,
    )

    response = client.get("/api/stats/overview", params={"start": TODAY, "end": TODAY}, headers=auth_headers)
    data = response.json()
    # 09:00-10:00 与 09:30-11:00 合并成 09:00-11:00 = 120 分钟，而不是 150 分钟
    assert data["planned_minutes"] == 120
    assert data["days"][0]["planned_minutes"] == 120
    assert data["cancelled_plans"] == 1


def test_completion_rate_ignores_cancelled_plans(client, auth_headers):
    """改道不是失败：它既不进完成率的分母，也不进分子。"""
    client.post("/api/plans", json={"date": TODAY, "title": "done", "status": "done"}, headers=auth_headers)
    client.post("/api/plans", json={"date": TODAY, "title": "doing"}, headers=auth_headers)
    client.post("/api/plans", json={"date": TODAY, "title": "detour", "status": "cancelled"}, headers=auth_headers)

    response = client.get("/api/stats/overview", params={"start": TODAY, "end": TODAY}, headers=auth_headers)
    data = response.json()
    assert data["total_plans"] == 3
    assert data["self_plans"] == 2
    assert data["self_done_plans"] == 1
    assert data["completion_rate"] == 0.5


def test_completion_rate_combines_self_plans_and_records(client, auth_headers):
    """完成率 = (已抵达的自建计划 + 已完成的记一笔) / (自建计划 + 记一笔)。"""
    client.post("/api/plans", json={"date": TODAY, "title": "写周报"}, headers=auth_headers)
    client.post(
        "/api/records",
        json={"date": TODAY, "title": "背单词", "duration_minutes": 30, "category": "学习"},
        headers=auth_headers,
    )

    data = client.get("/api/stats/overview", params={"start": TODAY, "end": TODAY}, headers=auth_headers).json()
    assert data["self_plans"] == 1
    assert data["self_done_plans"] == 0
    assert data["records_count"] == 1
    assert data["done_records"] == 1
    assert data["completion_rate"] == 0.5

    # 计划抵达后 2 / 2
    plan_id = client.get("/api/plans", params={"start": TODAY, "end": TODAY}, headers=auth_headers).json()[0]["id"]
    client.patch(f"/api/plans/{plan_id}", json={"status": "done"}, headers=auth_headers)
    data = client.get("/api/stats/overview", params={"start": TODAY, "end": TODAY}, headers=auth_headers).json()
    assert data["completion_rate"] == 1.0

    # 没勾“标记为已完成”的记录只进分母
    client.post(
        "/api/records",
        json={"date": TODAY, "title": "半途而废", "is_completed": False, "category": "学习"},
        headers=auth_headers,
    )
    data = client.get("/api/stats/overview", params={"start": TODAY, "end": TODAY}, headers=auth_headers).json()
    assert data["done_records"] == 1
    assert data["records_count"] == 2
    assert data["completion_rate"] == 0.6667


def test_planned_minutes_ignore_reversed_times_but_keep_cross_midnight(client, auth_headers):
    """开始/结束填反的按无效处理，真正跨午夜（23:30-01:00）的仍然照常统计。"""
    client.post(
        "/api/plans",
        json={"date": TODAY, "title": "填反了", "start_time": "14:00", "end_time": "09:00"},
        headers=auth_headers,
    )
    response = client.get("/api/stats/overview", params={"start": TODAY, "end": TODAY}, headers=auth_headers)
    assert response.json()["planned_minutes"] == 0

    client.post(
        "/api/plans",
        json={"date": TODAY, "title": "夜航", "start_time": "23:30", "end_time": "01:00"},
        headers=auth_headers,
    )
    response = client.get("/api/stats/overview", params={"start": TODAY, "end": TODAY}, headers=auth_headers)
    assert response.json()["planned_minutes"] == 90


def test_planned_minutes_exclude_timetable_courses(client, auth_headers):
    """课表生成的课程只是提醒上课，不计入「计划用时」；自己新建的计划才算。"""
    monday = _next_monday()
    week_end = (monday + timedelta(days=6)).isoformat()
    term = "2025-2026-1"
    client.post(
        "/api/timetable/courses",
        json={
            "term": term,
            "week1_date": monday.isoformat(),
            "courses": [
                {
                    "term": term,
                    "name": "高数",
                    "day_of_week": 1,
                    "start_period": 1,
                    "end_period": 2,
                    "week_mask": "1111111111111111",
                    "week_label": "1-16周",
                }
            ],
        },
        headers=auth_headers,
    )
    generated = client.post(
        "/api/timetable/generate-plans", json={"term": term, "week_start": monday.isoformat()}, headers=auth_headers
    ).json()
    assert generated["created"] == 1

    # 课程计划（10:00-11:35 / 95 分钟）本身不计入计划用时
    data = client.get(
        "/api/stats/overview",
        params={"start": monday.isoformat(), "end": week_end},
        headers=auth_headers,
    ).json()
    assert data["total_plans"] == 1
    assert data["planned_minutes"] == 0
    assert data["days"][0]["planned_minutes"] == 0
    # 课表课程也不参与完成率（自建计划数仍为 0）
    assert data["self_plans"] == 0
    assert data["completion_rate"] == 0.0

    # 自己新建的计划才算
    client.post(
        "/api/plans",
        json={"date": monday.isoformat(), "title": "写周报", "start_time": "20:00", "end_time": "21:30"},
        headers=auth_headers,
    )
    data = client.get(
        "/api/stats/overview",
        params={"start": monday.isoformat(), "end": week_end},
        headers=auth_headers,
    ).json()
    assert data["total_plans"] == 2
    assert data["planned_minutes"] == 90
    assert data["days"][0]["planned_minutes"] == 90
