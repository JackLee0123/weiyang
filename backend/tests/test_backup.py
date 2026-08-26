from datetime import date


TODAY = date.today().isoformat()


def test_backup_roundtrip(client, auth_headers):
    client.post("/api/plans", json={"date": TODAY, "title": "p", "category": "A"}, headers=auth_headers)
    client.post("/api/records", json={"date": TODAY, "title": "r", "content": "x"}, headers=auth_headers)

    exported = client.post("/api/backup/export", headers=auth_headers).json()
    assert len(exported["plans"]) == 1
    assert len(exported["records"]) == 1
    assert exported["version"] == 1

    imported = client.post("/api/backup/import", json=exported, headers=auth_headers)
    assert imported.status_code == 200
    assert imported.json() == {"imported_plans": 1, "imported_records": 1}
    assert len(client.get("/api/plans", headers=auth_headers).json()) == 1
    assert len(client.get("/api/records", headers=auth_headers).json()) == 1
