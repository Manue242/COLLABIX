import io


def make_fake_video(name: str = "test.mp4") -> tuple:
    return (name, io.BytesIO(b"\x00\x00\x00\x18ftyp"), "video/mp4")


async def test_upload_video(client):
    name, data, ct = make_fake_video()
    r = await client.post(
        "/api/videos/upload",
        files={"file": (name, data, ct)},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["filename"] == name
    assert body["url"] == f"/videos/{name}"


async def test_list_videos_contains_upload(client):
    name, data, ct = make_fake_video("listed.mp4")
    await client.post("/api/videos/upload", files={"file": (name, data, ct)})

    r = await client.get("/api/videos/")
    assert r.status_code == 200
    filenames = [v["filename"] for v in r.json()]
    assert name in filenames


async def test_upload_invalid_format(client):
    r = await client.post(
        "/api/videos/upload",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
    )
    assert r.status_code == 400
