from collections.abc import Iterator
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.schema import CreateSchema, DropSchema

from app.core.config import Settings, get_settings
from app.core.db import Base, get_db
from app.core.models import User
from app.main import app
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import CurrentUser


@pytest.fixture
def postgres_sessions() -> Iterator[sessionmaker[Session]]:
    schema = f"pa04_test_{uuid4().hex}"
    engine = create_engine(
        get_settings().database_url,
        connect_args={"options": f"-csearch_path={schema}", "connect_timeout": 3},
    )
    with engine.begin() as connection:
        connection.execute(CreateSchema(schema))
        Base.metadata.create_all(connection)
    try:
        yield sessionmaker(engine, autoflush=False, expire_on_commit=False)
    finally:
        with engine.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        engine.dispose()


@pytest.fixture
def owner(postgres_sessions: sessionmaker[Session]) -> User:
    uid = str(uuid4())
    with postgres_sessions.begin() as db:
        user = User(firebase_uid=uid, email=f"{uid}@example.test", display_name="PA04 Owner")
        db.add(user)
    return user


@pytest.fixture
def client(
    postgres_sessions: sessionmaker[Session],
    owner: User,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[TestClient]:
    def test_db() -> Iterator[Session]:
        with postgres_sessions() as db:
            yield db

    def test_settings() -> Settings:
        return Settings(
            auth_dev_bypass=False,
            storage_local_dir=str(tmp_path / "storage"),
            libreoffice_binary="libreoffice",
            render_timeout_seconds=60,
            render_work_dir=str(
                Path(__file__).resolve().parents[4] / "tmp" / f"pytest-render-{uuid4().hex}"
            ),
        )

    identity = CurrentUser(
        id=owner.firebase_uid,
        email=owner.email,
        display_name=owner.display_name,
        auth_mode="firebase",
    )
    overrides: dict[Any, Any] = app.dependency_overrides
    monkeypatch.setitem(overrides, get_db, test_db)
    monkeypatch.setitem(overrides, get_settings, test_settings)
    monkeypatch.setitem(overrides, get_current_user, lambda: identity)
    with TestClient(app) as http:
        yield http
    app.dependency_overrides.clear()
