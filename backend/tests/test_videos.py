import io

import routers.videos as videos_router


def make_fake_video(name: str = "test.mp4", size: int = 100) -> tuple:
    return (name, io.BytesIO(b"\x00\x00\x00\x18ftyp" + b"\x00" * size), "video/mp4")


# --- Upload ---

async def test_upload_video(client):
    name, data, ct = make_fake_video("upload_basic.mp4")
    r = await client.post("/api/videos/upload", files={"file": (name, data, ct)})
    assert r.status_code == 200
    body = r.json()
    assert body["filename"] == name
    assert body["url"] == f"/videos/{name}"


async def test_upload_invalid_format(client):
    r = await client.post(
        "/api/videos/upload",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
    )
    assert r.status_code == 400


async def test_upload_invalid_format_image(client):
    r = await client.post(
        "/api/videos/upload",
        files={"file": ("photo.jpg", io.BytesIO(b"\xff\xd8\xff"), "image/jpeg")},
    )
    assert r.status_code == 400


async def test_upload_exceeds_size_limit(client, monkeypatch):
    monkeypatch.setattr(videos_router, "MAX_FILE_SIZE", 10)
    r = await client.post(
        "/api/videos/upload",
        files={"file": ("big.mp4", io.BytesIO(b"\x00" * 20), "video/mp4")},
    )
    assert r.status_code == 413


async def test_upload_exactly_at_size_limit_is_accepted(client, monkeypatch):
    monkeypatch.setattr(videos_router, "MAX_FILE_SIZE", 20)
    r = await client.post(
        "/api/videos/upload",
        files={"file": ("exact.mp4", io.BytesIO(b"\x00" * 20), "video/mp4")},
    )
    assert r.status_code == 200


# --- List ---

async def test_list_videos_contains_upload(client):
    name, data, ct = make_fake_video("listed.mp4")
    await client.post("/api/videos/upload", files={"file": (name, data, ct)})

    r = await client.get("/api/videos/")
    assert r.status_code == 200
    filenames = [v["filename"] for v in r.json()]
    assert name in filenames


async def test_list_videos_url_format(client):
    name, data, ct = make_fake_video("url_check.mp4")
    await client.post("/api/videos/upload", files={"file": (name, data, ct)})

    r = await client.get("/api/videos/")
    videos = {v["filename"]: v for v in r.json()}
    assert videos[name]["url"] == f"/videos/{name}"


async def test_list_videos_returns_list(client):
    r = await client.get("/api/videos/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# --- Delete ---

async def test_delete_video(client):
    name, data, ct = make_fake_video("to_delete.mp4")
    await client.post("/api/videos/upload", files={"file": (name, data, ct)})

    r = await client.delete(f"/api/videos/{name}")
    assert r.status_code == 200
    assert r.json()["deleted"] == name


async def test_delete_nonexistent_video(client):
    r = await client.delete("/api/videos/ghost_does_not_exist.mp4")
    assert r.status_code == 404


async def test_delete_video_removed_from_list(client):
    name, data, ct = make_fake_video("remove_from_list.mp4")
    await client.post("/api/videos/upload", files={"file": (name, data, ct)})

    list_before = [v["filename"] for v in (await client.get("/api/videos/")).json()]
    assert name in list_before

    await client.delete(f"/api/videos/{name}")

    list_after = [v["filename"] for v in (await client.get("/api/videos/")).json()]
    assert name not in list_after


async def test_upload_after_delete(client):
    name, data, ct = make_fake_video("reupload.mp4")
    await client.post("/api/videos/upload", files={"file": (name, data, ct)})
    await client.delete(f"/api/videos/{name}")

    _, data2, _ = make_fake_video(name)
    r = await client.post("/api/videos/upload", files={"file": (name, data2, "video/mp4")})
    assert r.status_code == 200
    assert r.json()["filename"] == name


async def test_delete_already_deleted_video(client):
    name, data, ct = make_fake_video("double_delete.mp4")
    await client.post("/api/videos/upload", files={"file": (name, data, ct)})
    await client.delete(f"/api/videos/{name}")

    r = await client.delete(f"/api/videos/{name}")
    assert r.status_code == 404


# --- Metadata (title/description/category) ---

async def test_upload_persists_metadata(client):
    name, data, ct = make_fake_video("with_meta.mp4")
    r = await client.post(
        "/api/videos/upload",
        files={"file": (name, data, ct)},
        data={"title": "Mon titre", "description": "Une description", "category": "Formations"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "Mon titre"
    assert body["category"] == "Formations"

    listed = {v["filename"]: v for v in (await client.get("/api/videos/")).json()}
    assert listed[name]["title"] == "Mon titre"
    assert listed[name]["description"] == "Une description"


async def test_patch_video_updates_metadata(client):
    name, data, ct = make_fake_video("editable.mp4")
    await client.post("/api/videos/upload", files={"file": (name, data, ct)}, data={"title": "Ancien titre"})

    r = await client.patch(f"/api/videos/{name}", data={"title": "Nouveau titre"})
    assert r.status_code == 200
    assert r.json()["title"] == "Nouveau titre"

    listed = {v["filename"]: v for v in (await client.get("/api/videos/")).json()}
    assert listed[name]["title"] == "Nouveau titre"


async def test_patch_nonexistent_video_returns_404(client):
    r = await client.patch("/api/videos/ghost_edit.mp4", data={"title": "x"})
    assert r.status_code == 404
