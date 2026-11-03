from __future__ import annotations

import os
from typing import Iterable

import httpx
from pydantic import BaseModel, Field

from app.models import DocumentBlock, FieldSuggestion, SuggestionResponse


class OllamaEnvelope(BaseModel):
    suggestions: list[FieldSuggestion] = Field(default_factory=list)


class OllamaSuggester:
    """Optional structured suggestion provider; never writes to a form definition."""

    def __init__(self, base_url: str | None = None, model: str | None = None) -> None:
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL", "")).rstrip("/")
        self.model = model or os.getenv("OLLAMA_MODEL", "")

    @property
    def available(self) -> bool:
        return bool(self.base_url and self.model)

    async def suggest(self, blocks: Iterable[DocumentBlock]) -> SuggestionResponse:
        candidates = list(blocks)
        if not self.available:
            return SuggestionResponse(
                provider="ollama_unavailable",
                diagnostics=["Ollama is not configured. Deterministic detection remains available."],
            )
        document_text = "\n\n".join(f"[{block.id}]\n{block.text}" for block in candidates)
        prompt = (
            "Identify only likely fillable regions in this DOCX text. Return JSON matching the schema. "
            "Every region must reference a supplied block_id and use character offsets into that block. "
            "Do not suggest fixed headings, boilerplate, or text outside the supplied blocks. "
            "This is a suggestion for a human reviewer, not an edit.\n\n"
            f"DOCUMENT BLOCKS\n{document_text}"
        )
        payload = {
            "model": self.model,
            "stream": False,
            "format": OllamaEnvelope.model_json_schema(),
            "options": {"temperature": 0},
            "messages": [{"role": "user", "content": prompt}],
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                response.raise_for_status()
            envelope = OllamaEnvelope.model_validate_json(response.json()["message"]["content"])
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            return SuggestionResponse(provider="ollama", diagnostics=[f"Ollama returned no usable suggestion: {exc}"])

        source_by_id = {block.id: block for block in candidates}
        verified: list[FieldSuggestion] = []
        diagnostics: list[str] = []
        for proposal in envelope.suggestions:
            source = source_by_id.get(proposal.block_id)
            if source is None or proposal.end > len(source.text):
                diagnostics.append(f"Ignored a suggestion with an invalid source range for {proposal.block_id}.")
                continue
            verified.append(proposal)
        return SuggestionResponse(provider="ollama", suggestions=verified, diagnostics=diagnostics)
