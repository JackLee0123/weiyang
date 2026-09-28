"""手环「设备发起」连接流程。"""


def _start(client, label="小米手环"):
    resp = client.post("/api/devices/handshake", json={"device_label": label})
    assert resp.status_code == 200, resp.text
    return resp.json()


def _poll(client, code, poll_token):
    return client.post(f"/api/devices/handshake/{code}/poll", json={"poll_token": poll_token})


def test_handshake_flow_binds_watch_to_account(client, auth_headers):
    started = _start(client)
    code, poll_token = started["code"], started["poll_token"]
    assert len(code) == 6 and code.isdigit()
    assert started["expires_in"] > 0

    # 手机还没确认时，手环只能拿到 pending。
    assert _poll(client, code, poll_token).json()["status"] == "pending"

    info = client.get(f"/api/devices/handshake/{code}", headers=auth_headers)
    assert info.status_code == 200
    assert info.json()["device_label"] == "小米手环"
    assert info.json()["status"] == "pending"

    approved = client.post(f"/api/devices/handshake/{code}/approve", headers=auth_headers)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"

    claimed = _poll(client, code, poll_token)
    assert claimed.status_code == 200
    body = claimed.json()
    assert body["status"] == "approved"
    assert body["name"] == "主人"
    token = body["token"]

    # 手环拿到的令牌就是普通访问令牌，可直接访问业务接口。
    watch_headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me", headers=watch_headers).status_code == 200

    # 令牌只下发一次。
    assert _poll(client, code, poll_token).json()["status"] == "claimed"


def test_poll_requires_matching_poll_token(client, auth_headers):
    started = _start(client)
    code = started["code"]
    client.post(f"/api/devices/handshake/{code}/approve", headers=auth_headers)

    # 只看到二维码（短码）的人拿不到令牌。
    resp = _poll(client, code, "not-the-right-token-but-long-enough")
    assert resp.status_code == 400


def test_approve_requires_login(client):
    started = _start(client)
    resp = client.post(f"/api/devices/handshake/{started['code']}/approve")
    assert resp.status_code == 401


def test_other_account_cannot_take_over_handshake(client, auth_headers, register_user):
    started = _start(client)
    code = started["code"]
    client.post(f"/api/devices/handshake/{code}/approve", headers=auth_headers)

    other = register_user("other@example.com")
    resp = client.post(f"/api/devices/handshake/{code}/approve", headers=other)
    assert resp.status_code == 400

    # 同一账号重复确认是幂等的。
    again = client.post(f"/api/devices/handshake/{code}/approve", headers=auth_headers)
    assert again.status_code == 200


def test_unknown_code_is_reported(client, auth_headers):
    assert client.get("/api/devices/handshake/000000", headers=auth_headers).status_code == 404
    assert _poll(client, "000000", "whatever-token").json()["status"] == "invalid"


def test_list_and_revoke_devices(client, auth_headers):
    started = _start(client)
    client.post(f"/api/devices/handshake/{started['code']}/approve", headers=auth_headers)
    token = _poll(client, started["code"], started["poll_token"]).json()["token"]

    devices = client.get("/api/devices", headers=auth_headers).json()
    watch = next(item for item in devices if item["device_kind"] == "watch")
    assert watch["device_label"] == "小米手环"
    assert watch["is_current"] is False
    current = next(item for item in devices if item["is_current"])
    # 不能解绑自己正在用的这条令牌。
    assert client.delete(f"/api/devices/{current['id']}", headers=auth_headers).status_code == 400

    assert client.delete(f"/api/devices/{watch['id']}", headers=auth_headers).status_code == 204
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_cannot_revoke_someone_elses_device(client, auth_headers, register_user):
    started = _start(client)
    client.post(f"/api/devices/handshake/{started['code']}/approve", headers=auth_headers)
    _poll(client, started["code"], started["poll_token"])
    devices = client.get("/api/devices", headers=auth_headers).json()
    watch = next(item for item in devices if item["device_kind"] == "watch")

    other = register_user("intruder@example.com")
    assert client.delete(f"/api/devices/{watch['id']}", headers=other).status_code == 404
