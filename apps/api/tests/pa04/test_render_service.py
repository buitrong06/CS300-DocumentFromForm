"""The optional HTTP render service (DEC-022), exercised against a local stub."""

from __future__ import annotations

import threading
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from app.core.config import Settings
from app.modules.rendering import service as rendering_service
from app.modules.rendering.service import RenderError, convert_to_pdf


class StubRenderer(ThreadingHTTPServer):
    status = 200
    body = b"%PDF-from-service"
    requests: list[tuple[str, str, bytes]]


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        server = self.server
        assert isinstance(server, StubRenderer)
        payload = self.rfile.read(int(self.headers["Content-Length"]))
        server.requests.append((self.path, self.headers["Content-Type"], payload))
        self.send_response(server.status)
        self.end_headers()
        self.wfile.write(server.body)

    def log_message(self, format: str, *args: object) -> None:
        pass


@pytest.fixture
def renderer() -> Iterator[StubRenderer]:
    server = StubRenderer(("127.0.0.1", 0), Handler)
    server.requests = []
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield server
    finally:
        server.shutdown()
        server.server_close()


@pytest.fixture(autouse=True)
def no_local_libreoffice(monkeypatch: pytest.MonkeyPatch) -> None:
    """A configured service must never silently fall back to the host renderer."""

    def forbidden(docx: bytes, settings: Settings) -> bytes:
        raise AssertionError("local LibreOffice must not run")

    monkeypatch.setattr(rendering_service, "_run_libreoffice", forbidden)


def settings_for(url: str) -> Settings:
    return Settings(render_service_url=url, render_timeout_seconds=5)


def test_configured_service_converts_the_docx(
    renderer: StubRenderer, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Documents must go straight to the configured service, never through a proxy.
    monkeypatch.setenv("HTTP_PROXY", "http://127.0.0.1:9")

    pdf = convert_to_pdf(b"PK-docx-bytes", settings_for(f"http://127.0.0.1:{renderer.server_port}/"))

    assert pdf == b"%PDF-from-service"
    [(path, content_type, payload)] = renderer.requests
    assert path == "/forms/libreoffice/convert"
    assert content_type.startswith("multipart/form-data")
    assert b'name="files"; filename="document.docx"' in payload
    assert b"PK-docx-bytes" in payload


@pytest.mark.parametrize(("status", "body"), [(503, b"busy"), (200, b"<html>not a pdf</html>")])
def test_bad_service_responses_are_render_errors(
    renderer: StubRenderer, status: int, body: bytes
) -> None:
    renderer.status, renderer.body = status, body

    with pytest.raises(RenderError):
        convert_to_pdf(b"PK", settings_for(f"http://127.0.0.1:{renderer.server_port}"))


def test_unreachable_service_is_a_render_error() -> None:
    with pytest.raises(RenderError, match="unavailable"):
        convert_to_pdf(b"PK", settings_for("http://127.0.0.1:9"))
