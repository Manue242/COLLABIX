from datetime import datetime, timedelta, timezone

import jwt

import routers.hls as hls_router
import services.auth as auth_service
from tests.conftest import make_user


async def _get_session_token(client) -> str:
    user = make_user()
    await client.post("/auth/register", json=user)
    r = await client.post("/auth/login", json={"email": user["email"], "password": user["password"]})
    return r.json()["access_token"]


async def _get_key_token(client) -> str:
    """Flux réel du lecteur : login → GET /api/video/key-token → token scope=hls-key (60s)."""
    session_token = await _get_session_token(client)
    r = await client.get("/api/video/key-token", headers={"Authorization": f"Bearer {session_token}"})
    return r.json()["token"]


def _expired_key_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "scope": "hls-key",
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
    }
    return jwt.encode(payload, auth_service.SECRET_KEY, algorithm=auth_service.ALGORITHM)


# ── GET /api/video/key-token ──────────────────────────────────────────────

async def test_key_token_requires_auth(client):
    r = await client.get("/api/video/key-token")
    assert r.status_code == 403


async def test_key_token_returns_scoped_token(client):
    session_token = await _get_session_token(client)
    r = await client.get("/api/video/key-token", headers={"Authorization": f"Bearer {session_token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["expires_in"] == 60
    decoded = jwt.decode(body["token"], auth_service.SECRET_KEY, algorithms=[auth_service.ALGORITHM])
    assert decoded["scope"] == "hls-key"


# ── GET /api/video/key ────────────────────────────────────────────────────

async def test_key_requires_auth(client):
    r = await client.get("/api/video/key")
    assert r.status_code == 403


async def test_key_rejects_invalid_token(client):
    r = await client.get("/api/video/key", headers={"Authorization": "Bearer invalid.token.here"})
    assert r.status_code == 401


async def test_key_rejects_normal_session_token(client):
    """Le coeur du modèle Zero-Trust : le token de session (24h) seul ne suffit pas."""
    session_token = await _get_session_token(client)
    r = await client.get("/api/video/key", headers={"Authorization": f"Bearer {session_token}"})
    assert r.status_code == 401


async def test_key_rejects_expired_key_token(client):
    session_token = await _get_session_token(client)
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {session_token}"})
    user_id = r.json()["id"]
    expired = _expired_key_token(user_id)
    r = await client.get("/api/video/key", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


async def test_key_not_found_without_file(client, monkeypatch, tmp_path):
    monkeypatch.setattr(hls_router, "KEY_PATH", tmp_path / "missing.key")
    token = await _get_key_token(client)
    r = await client.get("/api/video/key", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404


async def test_key_returns_bytes_when_file_exists(client, monkeypatch, tmp_path):
    fake_key = tmp_path / "video.key"
    fake_key.write_bytes(b"\x00" * 16)
    monkeypatch.setattr(hls_router, "KEY_PATH", fake_key)

    token = await _get_key_token(client)
    r = await client.get("/api/video/key", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.content == b"\x00" * 16
    assert r.headers["content-type"] == "application/octet-stream"


async def test_key_rate_limit(client, monkeypatch, tmp_path):
    fake_key = tmp_path / "video.key"
    fake_key.write_bytes(b"\x01" * 16)
    monkeypatch.setattr(hls_router, "KEY_PATH", fake_key)
    monkeypatch.setattr(hls_router, "RATE_LIMIT", 3)

    token = await _get_key_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    for _ in range(3):
        r = await client.get("/api/video/key", headers=headers)
        assert r.status_code == 200

    r = await client.get("/api/video/key", headers=headers)
    assert r.status_code == 429


async def test_key_rate_limit_per_user_independent(client, monkeypatch, tmp_path):
    """Deux users distincts ont chacun leur propre compteur de rate limit."""
    fake_key = tmp_path / "video.key"
    fake_key.write_bytes(b"\x02" * 16)
    monkeypatch.setattr(hls_router, "KEY_PATH", fake_key)
    monkeypatch.setattr(hls_router, "RATE_LIMIT", 2)

    token_a = await _get_key_token(client)
    token_b = await _get_key_token(client)

    # épuiser le quota de user A
    for _ in range(2):
        await client.get("/api/video/key", headers={"Authorization": f"Bearer {token_a}"})
    r = await client.get("/api/video/key", headers={"Authorization": f"Bearer {token_a}"})
    assert r.status_code == 429

    # user B doit toujours pouvoir accéder
    r = await client.get("/api/video/key", headers={"Authorization": f"Bearer {token_b}"})
    assert r.status_code == 200


async def test_key_content_is_exact_bytes(client, monkeypatch, tmp_path):
    """Le contenu retourné est exactement les octets du fichier clé."""
    key_bytes = bytes(range(16))  # 0x00 à 0x0f
    fake_key = tmp_path / "video.key"
    fake_key.write_bytes(key_bytes)
    monkeypatch.setattr(hls_router, "KEY_PATH", fake_key)

    token = await _get_key_token(client)
    r = await client.get("/api/video/key", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.content == key_bytes
    assert len(r.content) == 16


async def test_hls_static_unknown_file_returns_404(client):
    """Le mount /hls/ retourne 404 pour un fichier inexistant, pas une erreur serveur."""
    r = await client.get("/hls/inexistant.m3u8")
    assert r.status_code == 404


async def test_key_rate_limit_error_message(client, monkeypatch, tmp_path):
    """Le 429 contient un message d'erreur lisible."""
    fake_key = tmp_path / "video.key"
    fake_key.write_bytes(b"\x03" * 16)
    monkeypatch.setattr(hls_router, "KEY_PATH", fake_key)
    monkeypatch.setattr(hls_router, "RATE_LIMIT", 1)

    token = await _get_key_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    await client.get("/api/video/key", headers=headers)
    r = await client.get("/api/video/key", headers=headers)
    assert r.status_code == 429
    assert "detail" in r.json()
