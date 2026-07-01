from routers.ws import room_users


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
