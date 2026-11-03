import asyncio

from app.models import DocumentBlock
from app.services.ollama import OllamaSuggester


def test_unconfigured_ollama_returns_actionable_diagnostic() -> None:
    response = asyncio.run(OllamaSuggester(base_url="", model="").suggest([
        DocumentBlock(id="body/p:0", kind="paragraph", text="Nội dung", path="body/p:0"),
    ]))
    assert response.provider == "ollama_unavailable"
    assert response.suggestions == []
