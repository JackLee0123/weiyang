import pytest

def _send_code(client, email):
    captcha = client.post("/api/captcha").json()
    token = client.post(
        "/api/captcha/verify",
        json={"captcha_id": captcha["captcha_id"], "x": captcha["target_x"]},
    ).json()["captcha_token"]
    return client.post("/api/auth/send-code", json={"email": email, "captcha_token": token})


from app.config import settings


def test_prod_blocks_send_code_without_smtp_and_devmode(client, monkeypatch):
    # 生产环境：SMTP 未配置且未开启开发模式，发码必须拒绝且不能回显验证码。
    monkeypatch.setattr(settings, "dev_mode", False)
    response = client.post("/api/auth/send-code", json={"email": "prod@example.com", "captcha_token": "x"})
    assert response.status_code == 503
    assert "dev_code" not in response.json()


def test_send_code_requires_valid_captcha(client):
    response = client.post(
        "/api/auth/send-code",
        json={"email": "blocked@example.com", "captcha_token": "not-a-real-token"},
    )
    assert response.status_code == 400


def test_send_code_is_rate_limited_per_ip(client):
    for index in range(10):
        response = _send_code(client, f"ip-{index}@example.com")
        assert response.status_code == 200
    assert _send_code(client, "ip-last@example.com").status_code == 429


def test_register_is_rate_limited(client, monkeypatch):
    payload = {"name": "限流", "email": "rate@example.com", "password": "Secret1!", "code": "000000", "captcha_token": "x"}
    for _ in range(10):
        assert client.post("/api/auth/register", json=payload).status_code == 400
    assert client.post("/api/auth/register", json=payload).status_code == 429


def test_register_requires_valid_captcha(client):
    code = _send_code(client, "cap@example.com").json()["dev_code"]
    payload = {"name": "拼图", "email": "cap@example.com", "password": "Secret1!", "code": code, "captcha_token": "not-a-real-token"}
    assert client.post("/api/auth/register", json=payload).status_code == 400


def test_captcha_create_hides_answer_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "dev_mode", False)
    data = client.post("/api/captcha").json()
    assert data["target_x"] is None
    assert data["background"]
    assert data["piece"]


def test_captcha_verify_wrong_x_fails(client):
    data = client.post("/api/captcha").json()
    response = client.post(
        "/api/captcha/verify",
        json={"captcha_id": data["captcha_id"], "x": data["target_x"] + 100},
    )
    assert response.status_code == 400


def test_captcha_verify_correct_x_succeeds(client):
    data = client.post("/api/captcha").json()
    response = client.post(
        "/api/captcha/verify",
        json={"captcha_id": data["captcha_id"], "x": data["target_x"]},
    )
    assert response.status_code == 200
    assert response.json()["captcha_token"]


def test_login_is_rate_limited(client, monkeypatch, captcha_ok):
    payload = {"email": "nobody@example.com", "password": "Wrong1!", "captcha_token": captcha_ok()}
    for _ in range(10):
        assert client.post("/api/auth/login", json=payload).status_code == 401
    assert client.post("/api/auth/login", json=payload).status_code == 429


def test_login_requires_valid_captcha(client):
    payload = {"email": "someone@example.com", "password": "Secret1!", "captcha_token": "not-a-real-token"}
    assert client.post("/api/auth/login", json=payload).status_code == 400


def test_forgot_password_requires_valid_captcha(client):
    payload = {"email": "someone@example.com", "captcha_token": "not-a-real-token"}
    assert client.post("/api/auth/forgot-password", json=payload).status_code == 400
