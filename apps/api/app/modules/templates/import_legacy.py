"""One-time import of a local Form Extraction SQLite export into PostgreSQL."""

import argparse
import sqlite3
from contextlib import closing
from hashlib import sha256
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.models import User
from app.modules.templates.schemas import FormGeneration, GenerationPatch
from app.modules.templates.store import FormGenerationStore


def import_generations(database_path: Path, store: FormGenerationStore) -> tuple[int, int, int]:
    imported = existing = skipped = 0
    with closing(sqlite3.connect(f"{database_path.resolve().as_uri()}?mode=ro", uri=True)) as db:
        columns = {row[1] for row in db.execute("PRAGMA table_info(form_generations)")}
        if "payload" not in columns:
            raise ValueError("The SQLite file has no form_generations table")
        query = "SELECT payload, source FROM form_generations ORDER BY id"
        if "source" not in columns:
            query = "SELECT payload, NULL FROM form_generations ORDER BY id"
        for payload, source in db.execute(query):
            generation = FormGeneration.model_validate_json(payload)
            if store.get(generation.id) is not None:
                existing += 1
            elif not source or sha256(source).hexdigest() != generation.sha256:
                skipped += 1
            else:
                GenerationPatch(revision=generation.revision, candidates=generation.candidates)
                store.create(generation, source)
                imported += 1
    return imported, existing, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sqlite_file", type=Path)
    parser.add_argument("--owner-uid", required=True, help="UID of the active template owner")
    args = parser.parse_args()
    settings = get_settings()
    if settings.storage_backend != "local":
        parser.exit(1, "Form generation requires local file storage\n")
    with SessionLocal() as db:
        with db.begin():
            owner_id = db.scalar(
                select(User.id).where(User.firebase_uid == args.owner_uid, User.is_active)
            )
        if owner_id is None:
            parser.exit(1, "The selected owner must be an active PostgreSQL user\n")
        store = FormGenerationStore(db, owner_id, Path(settings.storage_local_dir))
        try:
            imported, existing, skipped = import_generations(args.sqlite_file, store)
        except IntegrityError:
            parser.exit(1, "Import stopped because a generation conflicts with PostgreSQL data\n")
        except ValueError:
            parser.exit(1, "Import stopped because a legacy generation or table is invalid\n")
        except sqlite3.Error:
            parser.exit(1, "Could not read the legacy SQLite file\n")
    print(f"Imported: {imported}. Already present: {existing}. Missing or invalid DOCX: {skipped}.")
    if skipped:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
