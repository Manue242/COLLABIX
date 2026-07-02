from routers.ws import room_users
from tests.conftest import make_user


async def test_sessions_unknown_room_returns_empty(client):
    r = await client.get("/api/sessions/nonexistent-video-xyz/users")
    assert r.status_code == 200
    data = r.json()
    assert data["video_id"] == "nonexistent-video-xyz"
    assert data["users"] == []


async def test_sessions_response_structure(client):
    r = await client.get("/api/sessions/any-video/users")
    assert r.status_code == 200
    data = r.json()
    assert "video_id" in data
    assert "users" in data
    assert isinstance(data["users"], list)


async def test_sessions_with_single_user(client):
    video_id = "session-single-user"
    room_users[video_id] = {"user-abc"}
    try:
        r = await client.get(f"/api/sessions/{video_id}/users")
        assert r.status_code == 200
        data = r.json()
        assert data["video_id"] == video_id
        assert data["users"] == ["user-abc"]
    finally:
        room_users.pop(video_id, None)


async def test_sessions_with_multiple_users(client):
    video_id = "session-multi-user"
    room_users[video_id] = {"alice", "bob", "charlie"}
    try:
        r = await client.get(f"/api/sessions/{video_id}/users")
        assert r.status_code == 200
        data = r.json()
        assert data["video_id"] == video_id
        assert sorted(data["users"]) == ["alice", "bob", "charlie"]
    finally:
        room_users.pop(video_id, None)


async def test_sessions_users_sorted_alphabetically(client):
    video_id = "session-sorted"
    room_users[video_id] = {"zebra", "alpha", "mike", "beta"}
    try:
        r = await client.get(f"/api/sessions/{video_id}/users")
        users = r.json()["users"]
        assert users == sorted(users)
    finally:
        room_users.pop(video_id, None)


async def test_sessions_video_id_in_response_matches_request(client):
    video_id = "my-specific-video-42"
    r = await client.get(f"/api/sessions/{video_id}/users")
    assert r.json()["video_id"] == video_id


async def test_sessions_empty_after_cleanup(client):
    video_id = "session-cleanup"
    room_users[video_id] = {"tmp-user"}
    room_users.pop(video_id)

    r = await client.get(f"/api/sessions/{video_id}/users")
    assert r.json()["users"] == []


async def test_sessions_resolves_usernames_for_real_users(client):
    """user_id valides (vrais UUID users) sont résolus en usernames ; le reste est ignoré."""
    user = make_user()
    reg = await client.post("/auth/register", json=user)
    user_id = reg.json()["id"]

    video_id = "session-real-user"
    room_users[video_id] = {user_id, "anonymous"}
    try:
        r = await client.get(f"/api/sessions/{video_id}/users")
        data = r.json()
        assert sorted(data["users"]) == sorted([user_id, "anonymous"])
        assert data["usernames"][user_id] == user["username"]
        assert "anonymous" not in data["usernames"]
    finally:
        room_users.pop(video_id, None)


async def test_sessions_usernames_empty_dict_when_no_real_users(client):
    video_id = "session-no-real-users"
    room_users[video_id] = {"alice", "bob"}
    try:
        r = await client.get(f"/api/sessions/{video_id}/users")
        assert r.json()["usernames"] == {}
    finally:
        room_users.pop(video_id, None)
