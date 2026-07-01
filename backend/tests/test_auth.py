from tests.conftest import make_user, register_and_login


async def test_register(client):
    user = make_user()
    r = await client.post("/auth/register", json=user)
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == user["email"]
    assert data["username"] == user["username"]
    assert "hashed_password" not in data


async def test_register_duplicate(client):
    user = make_user()
    await client.post("/auth/register", json=user)
    r = await client.post("/auth/register", json=user)
    assert r.status_code == 409


async def test_login_success(client):
    user = make_user()
    await client.post("/auth/register", json=user)
    r = await client.post("/auth/login", json={"email": user["email"], "password": user["password"]})
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["token_type"] == "bearer"


async def test_login_wrong_password(client):
    user = make_user()
    await client.post("/auth/register", json=user)
    r = await client.post("/auth/login", json={"email": user["email"], "password": "mauvais"})
    assert r.status_code == 401


async def test_login_unknown_email(client):
    r = await client.post("/auth/login", json={"email": "nope@test.com", "password": "test"})
    assert r.status_code == 401


async def test_me(client):
    user = make_user()
    token = await register_and_login(client, user)
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == user["email"]


async def test_me_no_token(client):
    r = await client.get("/auth/me")
    assert r.status_code == 403


async def test_me_invalid_token(client):
    r = await client.get("/auth/me", headers={"Authorization": "Bearer token_invalide"})
    assert r.status_code == 401


async def test_change_password(client):
    user = make_user()
    token = await register_and_login(client, user)
    r = await client.post(
        "/auth/password",
        json={"current_password": user["password"], "new_password": "nouveaumdp456"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200

    # Vérifier que l'ancien mot de passe ne fonctionne plus
    r = await client.post("/auth/login", json={"email": user["email"], "password": user["password"]})
    assert r.status_code == 401

    # Vérifier que le nouveau fonctionne
    r = await client.post("/auth/login", json={"email": user["email"], "password": "nouveaumdp456"})
    assert r.status_code == 200


async def test_change_password_wrong_current(client):
    user = make_user()
    token = await register_and_login(client, user)
    r = await client.post(
        "/auth/password",
        json={"current_password": "mauvais", "new_password": "nouveaumdp456"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400
