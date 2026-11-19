from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.core.config import Settings, get_settings
from app.main import app


def test_health_ok(monkeypatch: MonkeyPatch) -> None:
    """Return 200 OK when PostgreSQL connectivity succeeds."""
    monkeypatch.setattr("app.main.check_db_connection", lambda: True)
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"


def test_health_degraded_when_db_unavailable(monkeypatch: MonkeyPatch) -> None:
    """Return 503 Service Unavailable when PostgreSQL connectivity fails."""
    monkeypatch.setattr("app.main.check_db_connection", lambda: False)
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["database"] == "disconnected"


def test_auth_me_dev_bypass() -> None:
    """Return dev user identity when AUTH_DEV_BYPASS is enabled."""
    app.dependency_overrides[get_settings] = lambda: Settings(
        auth_dev_bypass=True,
        auth_dev_user_email="dev@example.com",
    )
    try:
        client = TestClient(app)
        response = client.get("/api/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "id": "dev-user-001",
        "email": "dev@example.com",
        "display_name": "Dev User",
        "auth_mode": "dev_bypass",
    }


def test_auth_me_requires_token_when_bypass_disabled() -> None:
    """Reject unauthenticated requests with 401 when AUTH_DEV_BYPASS is disabled."""
    app.dependency_overrides[get_settings] = lambda: Settings(auth_dev_bypass=False)
    try:
        client = TestClient(app)
        response = client.get("/api/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
