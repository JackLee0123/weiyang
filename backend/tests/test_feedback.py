from app.services import email


def test_submit_feedback(client, auth_headers, monkeypatch):
    captured = {}

    def fake_send(**kwargs):
        captured.update(kwargs)
        return {"delivered": True}

    monkeypatch.setattr(email, "send_feedback_email", fake_send)

    response = client.post(
        "/api/feedback",
        data={"content": "建议支持周视图", "contact": "jack@example.com"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["submitted"] is True
    assert captured["content"] == "建议支持周视图"
    assert captured["submitter_email"] == "owner@example.com"
    assert captured["contact"] == "jack@example.com"


def test_submit_feedback_with_image(client, auth_headers, monkeypatch):
    captured = {}

    def fake_send(**kwargs):
        captured.update(kwargs)
        return {"delivered": True}

    monkeypatch.setattr(email, "send_feedback_email", fake_send)

    files = {"images": ("shot.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    response = client.post(
        "/api/feedback",
        data={"content": "这里有个 bug"},
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 200
    attachments = captured["attachments"]
    assert len(attachments) == 1
    assert attachments[0][1] == b"\x89PNG\r\n\x1a\n"


def test_submit_feedback_requires_auth(client):
    response = client.post("/api/feedback", data={"content": "匿名反馈"})
    assert response.status_code == 401


def test_submit_feedback_requires_content(client, auth_headers):
    response = client.post("/api/feedback", data={"content": "   "}, headers=auth_headers)
    assert response.status_code == 422
