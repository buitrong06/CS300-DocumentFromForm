from app.modules.templates.schemas import DocumentBlock
from app.modules.templates.services.ollama import OllamaSuggester


def test_unconfigured_ollama_returns_actionable_diagnostic() -> None:
    response = OllamaSuggester(base_url="", model="").suggest(
        [
            DocumentBlock(
                id="body/p:0",
                kind="paragraph",
                text="Nội dung",
                path="body/p:0",
            ),
        ]
    )
    assert response.provider == "ollama_unavailable"
    assert response.suggestions == []
