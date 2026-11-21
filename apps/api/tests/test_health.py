import pytest
from fastapi import HTTPException
from pytest import MonkeyPatch

from app.core.config import Settings
from app.main import health_check
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.router import read_current_user


def test_health_ok(monkeypatch: MonkeyPatch) -> None:
    """Return 200 OK when PostgreSQL connectivity succeeds."""
    monkeypatch.setattr("app.main.check_db_connection", lambda: True)

    response = health_check()

    assert response.status_code == 200
    assert b'"status":"ok"' in response.body
    assert b'"database":"connected"' in response.body


def test_health_degraded_when_db_unavailable(monkeypatch: MonkeyPatch) -> None:
    """Return 503 Service Unavailable when PostgreSQL connectivity fails."""
    monkeypatch.setattr("app.main.check_db_connection", lambda: False)

    response = health_check()

    assert response.status_code == 503
    assert b'"status":"degraded"' in response.body
    assert b'"database":"disconnected"' in response.body


def test_auth_me_dev_bypass() -> None:
    """Return dev user identity when AUTH_DEV_BYPASS is enabled."""
    current_user = get_current_user(
        credentials=None,
        settings=Settings(
            auth_dev_bypass=True,
            auth_dev_user_email="dev@example.com",
        ),
    )

    response = read_current_user(current_user)

    assert response.model_dump() == {
        "id": "dev-user-001",
        "email": "dev@example.com",
        "display_name": "Dev User",
        "auth_mode": "dev_bypass",
    }


def test_auth_me_requires_token_when_bypass_disabled() -> None:
    """Reject unauthenticated requests with 401 when AUTH_DEV_BYPASS is disabled."""
    with pytest.raises(HTTPException) as captured:
        get_current_user(
            credentials=None,
            settings=Settings(auth_dev_bypass=False),
        )

    assert captured.value.status_code == 401
