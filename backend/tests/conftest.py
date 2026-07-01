import os
import uuid
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://collabix:collabix@localhost:5432/collabix_test?ssl=false",
)


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    from database import Base
    import models.user  # noqa: F401
    import models.annotation  # noqa: F401

    engine = create_async_engine(TEST_DATABASE_URL, echo=False, connect_args={"ssl": False})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(test_engine):
    from main import app
    from database import get_db

    TestSession = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with TestSession() as session:
            yield session

    Path("uploads").mkdir(exist_ok=True)
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


def make_user():
    uid = str(uuid.uuid4())[:8]
    return {
        "email": f"user_{uid}@test.com",
        "username": f"user_{uid}",
        "password": "password123",
    }


async def register_and_login(client, user: dict) -> str:
    await client.post("/auth/register", json=user)
    r = await client.post("/auth/login", json={"email": user["email"], "password": user["password"]})
    return r.json()["access_token"]
