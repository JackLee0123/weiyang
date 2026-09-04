from datetime import date
import base64
import io

from PIL import Image


TODAY = date.today().isoformat()


def _png_data_uri() -> str:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), (255, 0, 0)).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def test_backup_roundtrip(client, auth_headers):
    image = _png_data_uri()
    client.post("/api/plans", json={"date": TODAY, "title": "p", "category": "A", "images": [image]}, headers=auth_headers)
    client.post("/api/records", json={"date": TODAY, "title": "r", "content": "x", "images": [image]}, headers=auth_headers)

    exported = client.post("/api/backup/export", headers=auth_headers).json()
    assert len(exported["plans"]) == 1
    assert len(exported["records"]) == 1
    assert exported["version"] == 1
    assert len(exported["plans"][0]["images"]) == 1
    assert len(exported["records"][0]["images"]) == 1

    imported = client.post("/api/backup/import", json=exported, headers=auth_headers)
    assert imported.status_code == 200
    assert imported.json() == {"imported_plans": 1, "imported_records": 1}
    plans = client.get("/api/plans", headers=auth_headers).json()
    records = client.get("/api/records", headers=auth_headers).json()
    assert len(plans) == 1
    assert len(records) == 1
    assert len(plans[0]["images"]) == 1
    assert len(records[0]["images"]) == 1
