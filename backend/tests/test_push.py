from app.services import push as push_service


P256DH = "BNo0jm9JHia8ii_vLfL-ybz9cEFeQRlrMrmx7ZXwUkFFlIKhGNxx5L41fj7Jjxwlj2gfu51fp3MkYxb-1YYEPVE"
AUTH = "AAAAAAAAAAAAAAAAAAAAAA"
ENDPOINT = "https://example.com/push/device-1"


def _subscribe_payload(endpoint: str = ENDPOINT) -> dict:
    return {"endpoint": endpoint, "keys": {"p256dh": P256DH, "auth": AUTH}, "user_agent": "TestClient"}


def test_config_is_public(client):
    res = client.get("/api/push/config")
    assert res.status_code == 200
    data = res.json()
    assert data["server_supported"] is True
    assert data["public_key"]


def test_subscribe_requires_auth(client):
    assert client.post("/api/push/subscribe", json=_subscribe_payload()).status_code == 401


def test_subscribe_stores_and_dedupes(client, auth_headers):
    assert client.post("/api/push/subscribe", json=_subscribe_payload(), headers=auth_headers).status_code == 201
    status = client.get("/api/push/status", headers=auth_headers).json()
    assert status["subscriptions"] == 1

    # 同一 endpoint 重复订阅不会新增记录
    client.post("/api/push/subscribe", json=_subscribe_payload(), headers=auth_headers)
    status = client.get("/api/push/status", headers=auth_headers).json()
    assert status["subscriptions"] == 1


def test_subscribe_rejects_http_endpoint(client, auth_headers):
    bad = _subscribe_payload(endpoint="http://example.com/push/1")
    assert client.post("/api/push/subscribe", json=bad, headers=auth_headers).status_code == 422


def test_subscribe_rejects_bad_keys(client, auth_headers):
    bad = _subscribe_payload()
    bad["keys"]["p256dh"] = "short"
    assert client.post("/api/push/subscribe", json=bad, headers=auth_headers).status_code == 422


def test_unsubscribe_removes_subscription(client, auth_headers):
    client.post("/api/push/subscribe", json=_subscribe_payload(), headers=auth_headers)
    res = client.post("/api/push/unsubscribe", json={"endpoint": ENDPOINT}, headers=auth_headers)
    assert res.status_code == 204
    status = client.get("/api/push/status", headers=auth_headers).json()
    assert status["subscriptions"] == 0


def test_test_push_without_subscription_returns_400(client, auth_headers):
    res = client.post("/api/push/test", headers=auth_headers)
    assert res.status_code == 400


def test_test_push_with_subscription_succeeds(client, auth_headers, monkeypatch):
    client.post("/api/push/subscribe", json=_subscribe_payload(), headers=auth_headers)

    def fake_send_one(db, sub, payload):
        return True

    monkeypatch.setattr(push_service, "_send_one", fake_send_one)
    res = client.post("/api/push/test", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["success"] == 1


def test_send_requires_admin(client, auth_headers, monkeypatch):
    client.post("/api/push/subscribe", json=_subscribe_payload(), headers=auth_headers)

    def fake_send_one(db, sub, payload):
        return True

    monkeypatch.setattr(push_service, "_send_one", fake_send_one)
    res = client.post(
        "/api/push/send",
        json={"user_id": 1, "title": "新消息", "body": "你有一条新的通知", "url": "/notifications"},
        headers=auth_headers,
    )
    assert res.status_code == 403
