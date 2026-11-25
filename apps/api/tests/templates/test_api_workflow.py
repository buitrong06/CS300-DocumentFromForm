from collections.abc import Callable, Iterator
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from zipfile import ZipFile

from fastapi.testclient import TestClient
from pytest import MonkeyPatch, fixture
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.models import User
from app.main import app
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import CurrentUser
from app.modules.templates import router
from app.modules.templates.schemas import CandidateStatus, FormGeneration
from app.modules.templates.services.ollama import OllamaSuggester
from app.modules.templates.store import DOCX_MEDIA_TYPE
from tests.templates.test_docx_analyzer import docx_with_body

ENDPOINT = "/api/form-generations"


@fixture
def client(
    postgres_sessions: sessionmaker[Session], owner: User, tmp_path: Path, monkeypatch: MonkeyPatch
) -> Iterator[TestClient]:
    def test_db() -> Iterator[Session]:
        with postgres_sessions() as db:
            yield db

    monkeypatch.setitem(app.dependency_overrides, get_db, test_db)

    def test_settings() -> Settings:
        return Settings(auth_dev_bypass=False, storage_local_dir=str(tmp_path))

    settings_provider: Callable[[], Settings] = get_settings
    monkeypatch.setitem(app.dependency_overrides, settings_provider, test_settings)
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: identity(owner))
    with TestClient(app) as http:
        yield http


def identity(user: User) -> CurrentUser:
    return CurrentUser(
        id=user.firebase_uid, email=user.email, display_name=user.display_name, auth_mode="firebase"
    )


def upload_template(client: TestClient) -> FormGeneration:
    source = docx_with_body("<w:p><w:r><w:t>Ngày: {{ngày ký}}</w:t></w:r></w:p>")
    response = client.post(
        ENDPOINT,
        content=source,
        headers={"Content-Type": DOCX_MEDIA_TYPE, "X-Filename": quote("mẫu.docx")},
    )
    assert response.status_code == 201
    return FormGeneration.model_validate(response.json())


def test_upload_review_and_suggestion_workflow(
    client: TestClient, monkeypatch: MonkeyPatch
) -> None:
    monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)
    monkeypatch.delenv("OLLAMA_MODEL", raising=False)
    monkeypatch.setattr(router, "ollama", OllamaSuggester())

    created = upload_template(client)
    assert created.filename == "mẫu.docx"
    assert created.candidates[0].label == "ngày ký"
    path = f"{ENDPOINT}/{created.id}"
    assert FormGeneration.model_validate(client.get(path).json()) == created
    preview = client.get(f"{path}/source-preview")
    assert preview.status_code == 200
    assert "ngày ký" in preview.text

    candidate = created.candidates[0].model_copy(update={"status": CandidateStatus.ACCEPTED})
    patch = {"revision": created.revision, "candidates": [candidate.model_dump(mode="json")]}
    response = client.put(path, json=patch)
    assert response.status_code == 200
    saved = FormGeneration.model_validate(response.json())
    assert saved.status == "ready"
    assert saved.revision == 2
    assert client.put(path, json=patch).status_code == 409

    response = client.post(f"{path}/filled-document", json={"values": {candidate.id: "15/11/2026"}})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(DOCX_MEDIA_TYPE)
    encoded_filename = quote("mẫu-filled.docx")
    disposition = f"attachment; filename*=UTF-8''{encoded_filename}"
    assert response.headers["content-disposition"] == disposition
    with ZipFile(BytesIO(response.content)) as archive:
        document_xml = archive.read("word/document.xml").decode("utf-8")
    assert "15/11/2026" in document_xml
    assert "ngày ký" not in document_xml

    suggestions = client.post(f"{path}/suggestions", json={"include_llm": True})
    assert suggestions.status_code == 200
    assert suggestions.json()["provider"] == "ollama_unavailable"


def test_another_user_cannot_access_generation(
    client: TestClient, postgres_sessions: sessionmaker[Session], monkeypatch: MonkeyPatch
) -> None:
    created = upload_template(client)
    path = f"{ENDPOINT}/{created.id}"
    with postgres_sessions.begin() as db:
        other = User(firebase_uid="other", email="other@example.test", display_name="Other User")
        db.add(other)
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: identity(other))

    assert client.get(path).status_code == 404
    assert client.get(f"{path}/source-preview").status_code == 404
    assert client.put(path, json={"revision": 1, "candidates": []}).status_code == 404
    assert client.post(f"{path}/suggestions", json={}).status_code == 404
    assert client.post(f"{path}/filled-document", json={}).status_code == 404
    monkeypatch.delitem(app.dependency_overrides, get_current_user)
    assert client.get(path).status_code == 401
