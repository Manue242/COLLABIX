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


async def test_annotation_includes_username(client):
    user = make_user()
    await client.post("/auth/register", json=user)
    me = await client.post("/auth/login", json={"email": user["email"], "password": user["password"]})
    token = me.json()["access_token"]

    profile = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = profile.json()["id"]

    video_id = str(uuid.uuid4())
    annotation = make_annotation(video_id)
    annotation["user_id"] = user_id
    await client.post("/api/annotations", json=annotation)

    r = await client.get(f"/api/annotations?video_id={video_id}")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["username"] == user["username"]


# --- PATCH ---

async def test_patch_annotation_content_only(client):
    video_id = str(uuid.uuid4())
    r = await client.post("/api/annotations", json=make_annotation(video_id))
    annotation_id = r.json()["id"]
    original_color = r.json()["color"]

    r = await client.patch(f"/api/annotations/{annotation_id}", json={"content": "Contenu modifié"})
    assert r.status_code == 200
    data = r.json()
    assert data["content"] == "Contenu modifié"
    assert data["color"] == original_color


async def test_patch_annotation_color_only(client):
    video_id = str(uuid.uuid4())
    r = await client.post("/api/annotations", json=make_annotation(video_id))
    annotation_id = r.json()["id"]
    original_content = r.json()["content"]

    r = await client.patch(f"/api/annotations/{annotation_id}", json={"color": "#00ff00"})
    assert r.status_code == 200
    data = r.json()
    assert data["color"] == "#00ff00"
    assert data["content"] == original_content


async def test_patch_annotation_both_fields(client):
    video_id = str(uuid.uuid4())
    r = await client.post("/api/annotations", json=make_annotation(video_id))
    annotation_id = r.json()["id"]

    r = await client.patch(
        f"/api/annotations/{annotation_id}",
        json={"content": "Nouveau contenu", "color": "#0000ff"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["content"] == "Nouveau contenu"
    assert data["color"] == "#0000ff"


async def test_patch_annotation_not_found(client):
    r = await client.patch(
        "/api/annotations/00000000-0000-0000-0000-000000000000",
        json={"content": "ghost"},
    )
    assert r.status_code == 404


async def test_patch_annotation_persists(client):
    video_id = str(uuid.uuid4())
    r = await client.post("/api/annotations", json=make_annotation(video_id))
    annotation_id = r.json()["id"]

    await client.patch(f"/api/annotations/{annotation_id}", json={"content": "Persisté"})

    list_r = await client.get(f"/api/annotations?video_id={video_id}")
    target = next(a for a in list_r.json() if a["id"] == annotation_id)
    assert target["content"] == "Persisté"


async def test_patch_annotation_empty_body_unchanged(client):
    video_id = str(uuid.uuid4())
    r = await client.post("/api/annotations", json=make_annotation(video_id))
    annotation_id = r.json()["id"]
    original = r.json()

    r = await client.patch(f"/api/annotations/{annotation_id}", json={})
    assert r.status_code == 200
    assert r.json()["content"] == original["content"]
    assert r.json()["color"] == original["color"]


async def test_patch_annotation_returns_full_object(client):
    video_id = str(uuid.uuid4())
    r = await client.post("/api/annotations", json=make_annotation(video_id))
    annotation_id = r.json()["id"]

    r = await client.patch(f"/api/annotations/{annotation_id}", json={"content": "Check fields"})
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert "video_id" in data
    assert "timestamp" in data
    assert "created_at" in data
    assert data["id"] == annotation_id
