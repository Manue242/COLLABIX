from pathlib import Path

import routers.hls as hls_router
from tests.conftest import make_user


async def _get_token(client) -> str:
    user = make_user()
    await client.post("/auth/register", json=user)
    r = await client.post("/auth/login", json={"email": user["email"], "password": user["password"]})
    return r.json()["access_token"]


async def test_key_requires_auth(client):
    r = await client.get("/api/video/key")
    assert r.status_code == 403


async def test_key_rejects_invalid_token(client):
    r = await client.get("/api/video/key", headers={"Authorization": "Bearer invalid.token.here"})
    assert r.status_code == 401


async def test_key_not_found_without_file(client, monkeypatch, tmp_path):
    monkeypatch.setattr(hls_router, "KEY_PATH", tmp_path / "missing.key")
    token = await _get_token(client)
    r = await client.get("/api/video/key", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404


async def test_key_returns_bytes_when_file_exists(client, monkeypatch, tmp_path):
    fake_key = tmp_path / "video.key"
    fake_key.write_bytes(b"\x00" * 16)
    monkeypatch.setattr(hls_router, "KEY_PATH", fake_key)

    token = await _get_token(client)
    r = await client.get("/api/video/key", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.content == b"\x00" * 16
    assert r.headers["content-type"] == "application/octet-stream"


async def test_key_rate_limit(client, monkeypatch, tmp_path):
    fake_key = tmp_path / "video.key"
    fake_key.write_bytes(b"\x01" * 16)
    monkeypatch.setattr(hls_router, "KEY_PATH", fake_key)
    monkeypatch.setattr(hls_router, "RATE_LIMIT", 3)

    # vider le log de rate limit pour cet user
    user = make_user()
    await client.post("/auth/register", json=user)
    r = await client.post("/auth/login", json={"email": user["email"], "password": user["password"]})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    for _ in range(3):
        r = await client.get("/api/video/key", headers=headers)
        assert r.status_code == 200

    r = await client.get("/api/video/key", headers=headers)
    assert r.status_code == 429
