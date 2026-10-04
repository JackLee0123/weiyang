"""计划勾选完成后，应自动在「记录」里出现一条，并跟随计划变化。"""

from datetime import date, timedelta


TODAY = date.today().isoformat()
FUTURE = (date.today() + timedelta(days=1)).isoformat()


def _new_plan(client, headers, **extra):
    payload = {"date": FUTURE, "title": "写周报", "category": "工作", **extra}
    response = client.post("/api/plans", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


def _records(client, headers):
    return client.get("/api/records", headers=headers).json()


def test_finish_plan_creates_record(client, auth_headers):
    plan = _new_plan(
        client,
        auth_headers,
        start_time="09:00",
        end_time="10:30",
        description="把本周的进展整理一下",
    )
    assert _records(client, auth_headers) == []

    done = client.patch(f"/api/plans/{plan['id']}", json={"status": "done"}, headers=auth_headers).json()
    assert done["status"] == "done"

    records = _records(client, auth_headers)
    assert len(records) == 1
    record = records[0]
    assert record["source"] == "plan"
    assert record["title"] == "写周报"
    assert record["date"] == FUTURE
    assert record["category"] == "工作"
    assert record["content"] == "把本周的进展整理一下"
    assert record["duration_minutes"] == 90
    assert record["is_completed"] is True
    assert record["done_at"] is not None
    assert record["linked_plan_id"] == plan["id"]


def test_unfinish_plan_removes_record(client, auth_headers):
    plan = _new_plan(client, auth_headers)
    client.patch(f"/api/plans/{plan['id']}", json={"status": "done"}, headers=auth_headers)
    assert len(_records(client, auth_headers)) == 1

    client.patch(f"/api/plans/{plan['id']}", json={"status": "pending"}, headers=auth_headers)
    assert _records(client, auth_headers) == []

    # 再勾一次会重新生成，不会留下两条
    client.patch(f"/api/plans/{plan['id']}", json={"status": "done"}, headers=auth_headers)
    client.patch(f"/api/plans/{plan['id']}", json={"status": "done"}, headers=auth_headers)
    assert len(_records(client, auth_headers)) == 1


def test_plan_edits_flow_into_record(client, auth_headers):
    plan = _new_plan(client, auth_headers, start_time="09:00", end_time="10:00")
    client.patch(f"/api/plans/{plan['id']}", json={"status": "done"}, headers=auth_headers)

    client.patch(
        f"/api/plans/{plan['id']}",
        json={"title": "写月报", "category": "总结", "description": "改成月报", "start_time": "14:00", "end_time": "14:45"},
        headers=auth_headers,
    )
    records = _records(client, auth_headers)
    assert len(records) == 1
    assert records[0]["title"] == "写月报"
    assert records[0]["category"] == "总结"
    assert records[0]["content"] == "改成月报"
    assert records[0]["duration_minutes"] == 45


def test_manual_records_are_untouched(client, auth_headers):
    plan = _new_plan(client, auth_headers)
    manual = client.post(
        "/api/records",
        json={"date": FUTURE, "title": "自己记的", "linked_plan_id": plan["id"]},
        headers=auth_headers,
    ).json()
    assert manual["source"] == "manual"

    client.patch(f"/api/plans/{plan['id']}", json={"status": "done"}, headers=auth_headers)
    assert len(_records(client, auth_headers)) == 2

    # 取消完成时只删自动生成的那条，手写的留着
    client.patch(f"/api/plans/{plan['id']}", json={"status": "pending"}, headers=auth_headers)
    records = _records(client, auth_headers)
    assert [record["title"] for record in records] == ["自己记的"]
    assert records[0]["source"] == "manual"


def test_deleting_plan_removes_generated_record(client, auth_headers):
    plan = _new_plan(client, auth_headers)
    client.post(
        "/api/records",
        json={"date": FUTURE, "title": "手写记录", "linked_plan_id": plan["id"]},
        headers=auth_headers,
    )
    client.patch(f"/api/plans/{plan['id']}", json={"status": "done"}, headers=auth_headers)
    assert len(_records(client, auth_headers)) == 2

    assert client.delete(f"/api/plans/{plan['id']}", headers=auth_headers).status_code == 204
    records = _records(client, auth_headers)
    assert [record["title"] for record in records] == ["手写记录"]
    assert records[0]["linked_plan_id"] is None


def test_manually_added_duration_survives_plan_edit(client, auth_headers):
    """计划里没写时间时，用户在记录里补的用时不该被计划同步冲掉。"""
    plan = _new_plan(client, auth_headers, title="词汇课")
    client.patch(f"/api/plans/{plan['id']}", json={"status": "done"}, headers=auth_headers)

    record = _records(client, auth_headers)[0]
    updated = client.patch(
        f"/api/records/{record['id']}",
        json={"duration_minutes": 25},
        headers=auth_headers,
    ).json()
    assert updated["duration_minutes"] == 25

    # 之后编辑计划（比如改个分类），记录里手填的用时保留
    client.patch(f"/api/plans/{plan['id']}", json={"category": "学习"}, headers=auth_headers)
    record = _records(client, auth_headers)[0]
    assert record["duration_minutes"] == 25
    assert record["category"] == "学习"

    # 一旦计划补上了正式开始 / 结束时间，就以计划算出的用时为准
    client.patch(
        f"/api/plans/{plan['id']}",
        json={"start_time": "09:00", "end_time": "09:40"},
        headers=auth_headers,
    )
    assert _records(client, auth_headers)[0]["duration_minutes"] == 40


def test_created_as_done_plan_also_records(client, auth_headers):
    plan = _new_plan(client, auth_headers, status="done")
    records = _records(client, auth_headers)
    assert len(records) == 1
    assert records[0]["linked_plan_id"] == plan["id"]


def test_completion_rate_is_not_double_counted(client, auth_headers):
    """计划完成自动补的记录，不能在完成率里再算一次。"""
    for index in range(4):
        plan = _new_plan(client, auth_headers, title=f"任务{index}")
        if index == 0:
            client.patch(f"/api/plans/{plan['id']}", json={"status": "done"}, headers=auth_headers)

    today = date.today()
    stats = client.get(
        "/api/stats/overview",
        params={"start": (today - timedelta(days=1)).isoformat(), "end": (today + timedelta(days=3)).isoformat()},
        headers=auth_headers,
    ).json()
    # 4 条计划里完成 1 条 = 25%；自动生成的记录不参与分母
    assert stats["self_plans"] == 4
    assert stats["self_done_plans"] == 1
    assert stats["records_count"] == 1
    assert stats["done_records"] == 1
    assert stats["completion_rate"] == 0.25
