from app.services import email


def _parts(msg):
    plain = msg.get_body(preferencelist=("plain",))
    html = msg.get_body(preferencelist=("html",))
    return plain.get_content(), html.get_content()


def test_register_verification_email_contains_brand_name():
    msg = email._build_verification_message("new@example.com", "123456", 600, "register")
    assert msg["Subject"] == "未央 · Everlong · 注册验证码"
    assert msg["To"] == "new@example.com"

    plain, html = _parts(msg)
    assert "未央 · Everlong" in plain
    assert "123456" in plain
    assert "10 分钟内有效" in plain
    assert "注册账号" in plain
    assert "未央 · Everlong" in html
    assert "123456" in html
    assert "欢迎注册" in html


def test_reset_verification_email_differs_from_register():
    msg = email._build_verification_message("reset@example.com", "654321", 300, "reset")
    assert msg["Subject"] == "未央 · Everlong · 重置密码验证码"

    plain, html = _parts(msg)
    assert "重置密码" in plain
    assert "654321" in plain
    assert "5 分钟内有效" in plain
    assert "并尽快登录修改密码" in plain
    assert "很高兴与你相遇" not in plain
    assert "重置密码" in html
