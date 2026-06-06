"""
Shared pytest fixtures for the entire test suite.

Uses an in-memory SQLite database via aiosqlite so tests never touch PostgreSQL.
The FastAPI app's get_db dependency is overridden to use the test session.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, UserRole

# ── In-memory test database ──────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = async_sessionmaker(engine_test, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


# ── Session-scoped DB setup ───────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── Function-scoped HTTP client ───────────────────────────────────────────────
@pytest_asyncio.fixture()
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ── Helper: create a user directly in DB ─────────────────────────────────────
@pytest_asyncio.fixture()
async def db_session():
    async with TestSessionLocal() as session:
        yield session


async def _create_user(
    db: AsyncSession,
    email: str,
    username: str,
    password: str = "Password123",
    role: UserRole = UserRole.student,
    is_approved: bool = True,
) -> User:
    user = User(
        email=email,
        username=username,
        full_name=f"Test {username}",
        hashed_password=hash_password(password),
        role=role,
        is_approved=is_approved,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _get_token(client: AsyncClient, email: str, password: str = "Password123") -> str:
    """Login and return access token."""
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
