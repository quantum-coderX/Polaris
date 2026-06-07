"""
Shared pytest fixtures using a file-based SQLite test database.

Why file-based (not in-memory):
  aiosqlite in-memory databases are per-connection. The app's get_db
  opens a NEW connection each request, so it cannot see data committed
  by a different connection. A file-based DB is shared by all connections.

Strategy:
  - Session-scoped: create tables once, drop after all tests.
  - Function-scoped: truncate all tables before each test (clean slate).
  - Both the test db_session and the app's get_db override use the same
    engine, so all reads/writes land in the same file.
"""
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, UserRole

# ── Test DB (file-based so all connections share the same data) ───────────────
TEST_DB_PATH = "./test_Polaris.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

engine_test = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)
TestSessionLocal = async_sessionmaker(
    engine_test,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ── Override app DB dependency (module-level, applies to all tests) ───────────
async def _override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

app.dependency_overrides[get_db] = _override_get_db


# ── Session-scoped: create all tables once ────────────────────────────────────
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    # Dispose engine to release file lock before deletion (important on Windows)
    await engine_test.dispose()
    try:
        os.remove(TEST_DB_PATH)
    except (FileNotFoundError, PermissionError):
        pass  # File already gone or still locked — CI will clean up


# ── Function-scoped: wipe all rows before every test (clean slate) ────────────
@pytest_asyncio.fixture(autouse=True)
async def clean_tables(setup_db):
    """Delete all rows from every table before each test."""
    async with engine_test.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


# ── Per-test DB session fixture ───────────────────────────────────────────────
@pytest_asyncio.fixture()
async def db_session(clean_tables):
    async with TestSessionLocal() as session:
        yield session


# ── Per-test HTTP client ──────────────────────────────────────────────────────
@pytest_asyncio.fixture()
async def client(clean_tables):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ── Shared helpers ────────────────────────────────────────────────────────────
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
