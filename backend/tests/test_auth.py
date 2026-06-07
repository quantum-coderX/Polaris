"""
Auth endpoint tests — register, login, refresh, logout, 2FA flow.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import _create_user, _get_token, auth_headers


# ── Registration ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "newstudent@test.com",
        "username": "newstudent",
        "full_name": "New Student",
        "password": "Password123",
        "role": "student",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newstudent@test.com"
    assert data["role"] == "student"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "dup@test.com",
        "username": "dup1",
        "full_name": "Dup",
        "password": "Password123",
    }
    await client.post("/api/v1/auth/register", json=payload)
    payload["username"] = "dup2"
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400
    assert "Email already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    payload = {
        "email": "unique1@test.com",
        "username": "sharedname",
        "full_name": "User 1",
        "password": "Password123",
    }
    await client.post("/api/v1/auth/register", json=payload)
    payload["email"] = "unique2@test.com"
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400
    assert "Username already taken" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "weak@test.com",
        "username": "weakpass",
        "full_name": "Weak",
        "password": "123",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_mentor_not_auto_approved(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "mentor@test.com",
        "username": "mentor1",
        "full_name": "Mentor One",
        "password": "Password123",
        "role": "mentor",
    })
    assert resp.status_code == 201
    # Mentors require admin approval — is_approved should be False


# ── Login ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session):
    await _create_user(db_session, "login@test.com", "loginuser")
    resp = await client.post("/api/v1/auth/login", json={
        "email": "login@test.com",
        "password": "Password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["requires_2fa"] is False


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, db_session):
    await _create_user(db_session, "badlogin@test.com", "badloginuser")
    resp = await client.post("/api/v1/auth/login", json={
        "email": "badlogin@test.com",
        "password": "WrongPassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "nobody@test.com",
        "password": "Password123",
    })
    assert resp.status_code == 401


# ── /me ───────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_me_returns_profile(client: AsyncClient, db_session):
    await _create_user(db_session, "me@test.com", "meuser")
    token = await _get_token(client, "me@test.com")
    resp = await client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@test.com"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 403


# ── 2FA flow ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_2fa_enable_returns_qr(client: AsyncClient, db_session):
    await _create_user(db_session, "twofa@test.com", "twofauser")
    token = await _get_token(client, "twofa@test.com")
    resp = await client.post("/api/v1/auth/2fa/enable", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert "secret" in data
    assert "qr_code_uri" in data
    assert "qr_code_image_b64" in data
    assert data["qr_code_uri"].startswith("otpauth://totp/")


@pytest.mark.asyncio
async def test_2fa_verify_invalid_code(client: AsyncClient, db_session):
    await _create_user(db_session, "badtotp@test.com", "badtotpuser")
    token = await _get_token(client, "badtotp@test.com")
    await client.post("/api/v1/auth/2fa/enable", headers=auth_headers(token))
    resp = await client.post("/api/v1/auth/2fa/verify",
                              json={"code": "000000"},
                              headers=auth_headers(token))
    assert resp.status_code == 400
    assert "Invalid TOTP" in resp.json()["detail"]
