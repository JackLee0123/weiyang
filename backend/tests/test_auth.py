def test_send_code_returns_dev_code_when_smtp_unset(client):
    response = client.post("/api/auth/send-code", json={"email": "a@example.com"})
    assert response.status_code == 200
    data = response.json()
    assert data["dev_code"] is not None
    assert len(data["dev_code"]) == 6
    assert data["expires_in"] > 0


def test_send_code_respects_cooldown(client):
    assert client.post("/api/auth/send-code", json={"email": "b@example.com"}).status_code == 200
    second = client.post("/api/auth/send-code", json={"email": "b@example.com"})
    assert second.status_code == 429


def test_register_with_valid_code(client):
    code = client.post("/api/auth/send-code", json={"email": "c@example.com"}).json()["dev_code"]
    response = client.post(
        "/api/auth/register",
        json={"name": "小明", "email": "c@example.com", "password": "Secret1!", "code": code},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "c@example.com"
    assert data["name"] == "小明"
    assert "id" in data
    assert data["token"]
    assert data["expires_in"] > 0


def test_register_requires_valid_code(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "小红", "email": "d@example.com", "password": "Secret1!", "code": "000000"},
    )
    assert response.status_code == 400


def test_register_enforces_password_policy(client):
    code = client.post("/api/auth/send-code", json={"email": "g@example.com"}).json()["dev_code"]
    base = {"name": "小张", "email": "g@example.com", "code": code}
    # 少于 8 位
    assert client.post("/api/auth/register", json={**base, "password": "Ab1!y"}).status_code == 422
    # 8 位但只含小写字母一种类型
    assert client.post("/api/auth/register", json={**base, "password": "abcdefgh"}).status_code == 422
    # 满足规则即可注册
    assert client.post("/api/auth/register", json={**base, "password": "Ab1!xxxx"}).status_code == 201


def test_register_rejects_duplicate_email(client):
    code = client.post("/api/auth/send-code", json={"email": "e@example.com"}).json()["dev_code"]
    payload = {"name": "小李", "email": "e@example.com", "password": "Secret1!", "code": code}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409


def test_login_with_registered_user(client):
    code = client.post("/api/auth/send-code", json={"email": "f@example.com"}).json()["dev_code"]
    client.post(
        "/api/auth/register",
        json={"name": "小刚", "email": "f@example.com", "password": "Secret1!", "code": code},
    )
    login = client.post("/api/auth/login", json={"email": "f@example.com", "password": "Secret1!"})
    assert login.status_code == 200
    token = login.json()["token"]
    assert client.post("/api/auth/login", json={"email": "f@example.com", "password": "wrong"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "nope@example.com", "password": "Secret1!"}).status_code == 401

    headers = {"Authorization": f"Bearer {token}"}
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/plans", headers=headers).status_code == 401


def test_forgot_and_reset_password(client):
    code = client.post("/api/auth/send-code", json={"email": "h@example.com"}).json()["dev_code"]
    session = client.post(
        "/api/auth/register",
        json={"name": "小何", "email": "h@example.com", "password": "Old1!abcd", "code": code},
    ).json()
    old_token = session["token"]

    # 未注册邮箱：404
    assert client.post("/api/auth/forgot-password", json={"email": "nope@example.com"}).status_code == 404

    # 已注册邮箱：生成重置验证码（测试为开发模式，返回 dev_code）
    reset_code = client.post("/api/auth/forgot-password", json={"email": "h@example.com"}).json()["dev_code"]
    assert reset_code

    # 错误验证码：400
    assert (
        client.post(
            "/api/auth/reset-password",
            json={"email": "h@example.com", "code": "000000", "password": "New1!zzzz"},
        ).status_code
        == 400
    )

    # 正确验证码：200
    response = client.post(
        "/api/auth/reset-password",
        json={"email": "h@example.com", "code": reset_code, "password": "New1!zzzz"},
    )
    assert response.status_code == 200
    assert response.json()["message"]

    # 旧密码失效，新密码可登录
    assert client.post("/api/auth/login", json={"email": "h@example.com", "password": "Old1!abcd"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "h@example.com", "password": "New1!zzzz"}).status_code == 200
    # 原登录令牌已被吊销
    assert client.get("/api/plans", headers={"Authorization": f"Bearer {old_token}"}).status_code == 401
