from collections.abc import Iterator
from os import getenv
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.schema import CreateSchema, DropSchema

from app.core.config import get_settings
from app.core.models import Base, User


@pytest.fixture(scope="session")
def postgres_sessions() -> Iterator[sessionmaker[Session]]:
    schema = f"form_extraction_test_{uuid4().hex}"
    engine = create_engine(
        get_settings().database_url,
        connect_args={"options": f"-csearch_path={schema}", "connect_timeout": 3},
    )
    try:
        try:
            with engine.begin() as connection:
                connection.execute(CreateSchema(schema))
                Base.metadata.create_all(connection)
        except OperationalError:
            if getenv("DATABASE_URL"):
                raise
            pytest.skip("PostgreSQL is required for the form extraction integration tests")
        try:
            yield sessionmaker(engine, autoflush=False, expire_on_commit=False)
        finally:
            with engine.begin() as connection:
                connection.execute(DropSchema(schema, cascade=True))
    finally:
        engine.dispose()


@pytest.fixture
def owner(postgres_sessions: sessionmaker[Session]) -> User:
    uid = str(uuid4())
    with postgres_sessions.begin() as db:
        user = User(firebase_uid=uid, email=f"{uid}@example.test", display_name="Test Owner")
        db.add(user)
    return user
