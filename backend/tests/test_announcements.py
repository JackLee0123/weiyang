def test_only_admin_can_broadcast(client, auth_headers, admin_headers):
    forbidden = client.post(
        "/api/announcements",
        json={"title": "越权尝试", "body": ""},
        headers=auth_headers,
    )
    assert forbidden.status_code == 403

    ok = client.post(
        "/api/announcements",
        json={"title": "服务器维护", "body": "今晚 22:00 会短暂停机。", "level": "important"},
        headers=admin_headers,
    )
    assert ok.status_code == 201
    payload = ok.json()
    assert payload["title"] == "服务器维护"
    assert payload["level"] == "important"
    assert payload["read_count"] == 0
    assert payload["created_by_name"] == "admin"


def test_user_sees_announcement_once_until_acknowledged(client, auth_headers, admin_headers):
    assert client.get("/api/announcements/latest", headers=auth_headers).json() is None

    announcement_id = client.post(
        "/api/announcements",
        json={"title": "新版上线", "body": "今天更新了通知页面。"},
        headers=admin_headers,
    ).json()["id"]

    latest = client.get("/api/announcements/latest", headers=auth_headers).json()
    assert latest["id"] == announcement_id
    assert latest["title"] == "新版上线"

    # 确认过之后不再弹
    assert (
        client.post(f"/api/announcements/{announcement_id}/read", headers=auth_headers).status_code
        == 204
    )
    assert client.get("/api/announcements/latest", headers=auth_headers).json() is None

    # 管理员能看到已读人数
    listed = client.get("/api/announcements", headers=admin_headers).json()
    assert listed[0]["read_count"] == 1
    assert listed[0]["user_count"] >= 2


def test_admin_can_delete_and_list_requires_admin(client, auth_headers, admin_headers):
    assert client.get("/api/announcements", headers=auth_headers).status_code == 403

    announcement_id = client.post(
        "/api/announcements",
        json={"title": "临时通知"},
        headers=admin_headers,
    ).json()["id"]
    assert client.delete(f"/api/announcements/{announcement_id}", headers=admin_headers).status_code == 204
    assert client.get("/api/announcements", headers=admin_headers).json() == []
    assert (
        client.post(f"/api/announcements/{announcement_id}/read", headers=auth_headers).status_code
        == 404
    )
