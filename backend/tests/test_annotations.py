import uuid
from tests.conftest import make_user, register_and_login


def make_annotation(video_id: str, timestamp: float = 10.0) -> dict:
    return {
        "video_id": video_id,
        "type": "comment",
        "content": "Test annotation",
        "timestamp": timestamp,
        "color": "#ff0000",
    }


async def test_create_annotation(client):
    video_id = str(uuid.uuid4())
    r = await client.post("/api/annotations", json=make_annotation(video_id))
    assert r.status_code == 201
    data = r.json()
    assert data["video_id"] == video_id
    assert data["timestamp"] == 10.0
    assert data["type"] == "comment"


async def test_list_annotations_sorted_by_timestamp(client):
    video_id = str(uuid.uuid4())
    await client.post("/api/annotations", json=make_annotation(video_id, timestamp=30.0))
    await client.post("/api/annotations", json=make_annotation(video_id, timestamp=5.0))
    await client.post("/api/annotations", json=make_annotation(video_id, timestamp=15.0))

    r = await client.get(f"/api/annotations?video_id={video_id}")
    assert r.status_code == 200
    timestamps = [a["timestamp"] for a in r.json()]
    assert timestamps == sorted(timestamps)


async def test_list_annotations_empty(client):
    video_id = str(uuid.uuid4())
    r = await client.get(f"/api/annotations?video_id={video_id}")
    assert r.status_code == 200
    assert r.json() == []


async def test_delete_annotation(client):
    video_id = str(uuid.uuid4())
    create = await client.post("/api/annotations", json=make_annotation(video_id))
    annotation_id = create.json()["id"]

    r = await client.delete(f"/api/annotations/{annotation_id}")
    assert r.status_code == 204

    r = await client.get(f"/api/annotations?video_id={video_id}")
    assert all(a["id"] != annotation_id for a in r.json())


async def test_delete_nonexistent(client):
    r = await client.delete("/api/annotations/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


async def test_export(client):
    video_id = str(uuid.uuid4())
    await client.post("/api/annotations", json=make_annotation(video_id, timestamp=42.5))

    r = await client.get(f"/api/annotations/export?video_id={video_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["version"] == "1.0"
    assert data["video_id"] == video_id
    assert isinstance(data["annotations"], list)
    assert len(data["annotations"]) == 1
    assert data["annotations"][0]["timestamp"] == 42.5


async def test_import(client):
    video_id = str(uuid.uuid4())
    payload = {
        "version": "1.0",
        "video_id": video_id,
        "exported_at": "2026-07-01T10:00:00Z",
        "annotations": [
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "type": "comment",
                "content": "Importé",
                "timestamp": 20.0,
                "color": "#00ff00",
                "user_id": None,
            }
        ],
    }
    r = await client.post("/api/annotations/import", json=payload)
    assert r.status_code == 201
    assert len(r.json()) == 1
    assert r.json()[0]["content"] == "Importé"


async def test_export_import_roundtrip(client):
    video_id = str(uuid.uuid4())
    await client.post("/api/annotations", json=make_annotation(video_id, timestamp=5.0))
    await client.post("/api/annotations", json=make_annotation(video_id, timestamp=10.0))

    export = await client.get(f"/api/annotations/export?video_id={video_id}")
    payload = export.json()

    new_video_id = str(uuid.uuid4())
    payload["video_id"] = new_video_id

    r = await client.post("/api/annotations/import", json=payload)
    assert r.status_code == 201
    assert len(r.json()) == 2
