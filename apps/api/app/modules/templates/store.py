from __future__ import annotations

import sqlite3
from pathlib import Path

from app.modules.templates.schemas import FormGeneration, GenerationPatch, utc_now


class FormGenerationStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connection(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connection() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS form_generations (
                    id TEXT PRIMARY KEY,
                    revision INTEGER NOT NULL,
                    payload TEXT NOT NULL,
                    source BLOB
                )
                """
            )
            columns = {
                row["name"] for row in connection.execute("PRAGMA table_info(form_generations)")
            }
            if "source" not in columns:
                connection.execute("ALTER TABLE form_generations ADD COLUMN source BLOB")

    def create(self, generation: FormGeneration, source: bytes = b"") -> FormGeneration:
        with self._connection() as connection:
            connection.execute(
                "INSERT INTO form_generations (id, revision, payload, source) VALUES (?, ?, ?, ?)",
                (generation.id, generation.revision, generation.model_dump_json(), source),
            )
        return generation

    def get(self, generation_id: str) -> FormGeneration | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT payload FROM form_generations WHERE id = ?", (generation_id,)
            ).fetchone()
        return FormGeneration.model_validate_json(row["payload"]) if row else None

    def get_source(self, generation_id: str) -> bytes | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT source FROM form_generations WHERE id = ?", (generation_id,)
            ).fetchone()
        return bytes(row["source"]) if row and row["source"] is not None else None

    def update(self, generation_id: str, patch: GenerationPatch) -> FormGeneration | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT revision, payload FROM form_generations WHERE id = ?", (generation_id,)
            ).fetchone()
            if row is None:
                return None
            if row["revision"] != patch.revision:
                raise RevisionConflict
            generation = FormGeneration.model_validate_json(row["payload"])
            generation.candidates = patch.candidates
            generation.revision += 1
            generation.status = (
                "ready"
                if all(candidate.status != "proposed" for candidate in generation.candidates)
                else "needs_review"
            )
            generation.updated_at = utc_now()
            connection.execute(
                "UPDATE form_generations SET revision = ?, payload = ? WHERE id = ?",
                (generation.revision, generation.model_dump_json(), generation_id),
            )
        return generation


class RevisionConflict(Exception):
    pass
