from datetime import date, timedelta
import base64
import io

from app import repository
from PIL import Image


TODAY = date.today().isoformat()
PAST = (date.today() - timedelta(days=1)).isoformat()
FUTURE = (date.today() + timedelta(days=1)).isoformat()


def _png_data_uri() -> str:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), (255, 0, 0)).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def test_record_crud_with_plan(client, auth_headers):
    plan = client.post("/api/plans", json={"date": FUTURE, "title": "p"}, headers=auth_headers).json()
    response = client.post(
        "/api/records",
        json={"date": FUTURE, "title": "t", "duration_minutes": 30, "linked_plan_id": plan["id"]},
        headers=auth_headers,
    )
    assert response.status_code == 201
    record = response.json()
    assert record["done_at"] is not None
    assert record["linked_plan_id"] == plan["id"]

    updated = client.patch(f"/api/records/{record['id']}", json={"duration_minutes": 45}, headers=auth_headers).json()
    assert updated["duration_minutes"] == 45

    assert client.delete(f"/api/records/{record['id']}", headers=auth_headers).status_code == 204
    assert client.get("/api/records", headers=auth_headers).json() == []


def test_record_requires_existing_plan(client, auth_headers):
    response = client.post(
        "/api/records",
        json={"date": FUTURE, "title": "t", "linked_plan_id": 9999},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_cannot_create_record_in_past(client, auth_headers):
    response = client.post("/api/records", json={"date": PAST, "title": "x"}, headers=auth_headers)
    assert response.status_code == 403


def test_cannot_move_record_to_past(client, auth_headers):
    record = client.post("/api/records", json={"date": TODAY, "title": "a"}, headers=auth_headers).json()
    response = client.patch(f"/api/records/{record['id']}", json={"date": PAST}, headers=auth_headers)
    assert response.status_code == 403


def test_cannot_edit_or_delete_frozen_past_record(client, monkeypatch, auth_headers):
    # 先把“今天”冻结到过去日期，得以创建记录，再把“今天”推进，让该记录变成历史。
    monkeypatch.setattr(repository, "today_iso", lambda: PAST)
    record = client.post("/api/records", json={"date": PAST, "title": "a"}, headers=auth_headers).json()

    monkeypatch.setattr(repository, "today_iso", lambda: TODAY)
    assert client.patch(f"/api/records/{record['id']}", json={"title": "b"}, headers=auth_headers).status_code == 403
    assert client.delete(f"/api/records/{record['id']}", headers=auth_headers).status_code == 403


def test_records_are_isolated_per_user(client, auth_headers, register_user):
    other_headers = register_user("other-rec@example.com")
    owner_record = client.post("/api/records", json={"date": TODAY, "title": "owner"}, headers=auth_headers).json()
    client.post("/api/records", json={"date": TODAY, "title": "other"}, headers=other_headers)

    assert [r["id"] for r in client.get("/api/records", headers=auth_headers).json()] == [owner_record["id"]]
    assert client.get(f"/api/records/{owner_record['id']}", headers=other_headers).status_code == 404


def test_cannot_link_record_to_other_users_plan(client, auth_headers, register_user):
    other_headers = register_user("other-link@example.com")
    plan = client.post("/api/plans", json={"date": FUTURE, "title": "p"}, headers=other_headers).json()
    response = client.post("/api/records", json={"date": FUTURE, "title": "t", "linked_plan_id": plan["id"]}, headers=auth_headers)
    assert response.status_code == 404


def test_create_record_with_images(client, auth_headers):
    image = _png_data_uri()
    created = client.post("/api/records", json={"date": FUTURE, "title": "t", "images": [image]}, headers=auth_headers)
    assert created.status_code == 201
    data = created.json()
    assert len(data["images"]) == 1
    assert data["images"][0].startswith(("data:image/png;base64,", "data:image/jpeg;base64,"))


def test_record_images_too_many(client, auth_headers):
    image = _png_data_uri()
    response = client.post("/api/records", json={"date": FUTURE, "title": "t", "images": [image] * 4}, headers=auth_headers)
    assert response.status_code == 422


def test_record_update_images_clear(client, auth_headers):
    image = _png_data_uri()
    record = client.post("/api/records", json={"date": FUTURE, "title": "t", "images": [image]}, headers=auth_headers).json()
    assert len(record["images"]) == 1

    cleared = client.patch(f"/api/records/{record['id']}", json={"images": []}, headers=auth_headers).json()
    assert cleared["images"] == []
