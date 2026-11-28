# Document: Fill and Deliver

A web application for Vietnamese administrative and organizational document preparation, guided form filling, deterministic & advisory content checking, hierarchical task delegation, immutable submission review, and authoritative DOCX/PDF export.

## Architecture & Tech Stack

- **Frontend (`apps/web/`)**: React + TypeScript + Vite (Feature-Folder layout: `src/app/`, `src/shared/`, `src/features/<slice>/`)
- **Backend (`apps/api/`)**: Python 3.12 + FastAPI Modular Monolith + SQLAlchemy 2.0 / Alembic
- **Database & Storage**: PostgreSQL 16 (relational metadata, `JSONB` schemas, append-only snapshots) + Local File Storage / Cloudflare R2 (`file_artifacts`)
- **Document & AI Engines**: `python-docx` / `docxtpl` + LibreOffice Headless (authoritative DOCX/PDF rendering; local subprocess by default, or the optional Gotenberg `renderer` container) + optional Ollama-compatible LLM (evidence-grounded semantic checks only)
- **Authentication**: Local-dev Auth Bypass for Week 0 development; Firebase Authentication for production/cloud target

## Repository Structure

```text
.
├── .github/                  # PR template & CI workflows
├── apps/
│   ├── api/                  # FastAPI backend application
│   └── web/                  # React + TypeScript + Vite frontend application
├── docs/
│   ├── MISSING_CONTEXT.md    # Baseline index, prioritized gaps & slice workflow
│   ├── requirements/         # Vision (v2.1), Use-Case Specification (v1.1), UI Prototype
│   ├── analysis-and-design/  # PRESET_DOMAIN, COMMUNICATION_DOMAIN, database-overview, ADRs
│   ├── architecture/c4/      # C1–C3 architecture diagrams & overview
│   ├── management/           # IMPLEMENTATION_STATUS, DECISIONS, ISSUES, WEEK0 plan
│   └── test/                 # Test plans & acceptance criteria
├── pa/                       # Course assignment deliverables (PA1–PA3)
├── .env.example              # Environment variable template
├── AGENTS.md                 # Engineering rules & domain invariants for AI coding agents
└── GLOSSARY.md               # Canonical domain terms
```

## Quick Start & Documentation Entrypoints

1. Start with [docs/MISSING_CONTEXT.md](docs/MISSING_CONTEXT.md), [GLOSSARY.md](GLOSSARY.md), and [AGENTS.md](AGENTS.md).
2. Review the Week 0 setup plan in [docs/management/WEEK0_CONTRACT_FIRST_SETUP.md](docs/management/WEEK0_CONTRACT_FIRST_SETUP.md) and the implemented shared foundation in [docs/management/PHASE0_SHARED_FOUNDATION.md](docs/management/PHASE0_SHARED_FOUNDATION.md).
3. Review technical specifications:
   - Architecture: [docs/architecture/c4/README.md](docs/architecture/c4/README.md)
   - Preset & Template Domain: [docs/analysis-and-design/PRESET_DOMAIN.md](docs/analysis-and-design/PRESET_DOMAIN.md)
   - Communication & Delegation Domain: [docs/analysis-and-design/COMMUNICATION_DOMAIN.md](docs/analysis-and-design/COMMUNICATION_DOMAIN.md)
   - Database ER Model: [docs/analysis-and-design/database-overview.md](docs/analysis-and-design/database-overview.md)
4. Copy `.env.example` to `.env` for local development.
5. Start PostgreSQL with `docker compose up -d postgres`. From `apps/api/`, run `alembic upgrade head` and `python -m app.core.seed` to provision the local development account and sample records.
6. PDF preview and export use a local LibreOffice (`LIBREOFFICE_BINARY`) by default. To use the optional Gotenberg `renderer` container instead (`DEC-022`), run `docker compose up -d renderer`, set `RENDER_SERVICE_URL=http://127.0.0.1:3100` in `.env`, and restart the API. A failed service call does not fall back to the local LibreOffice. For Times New Roman, see [fonts/README.md](fonts/README.md).
7. Track verified slice implementation progress in [docs/management/IMPLEMENTATION_STATUS.md](docs/management/IMPLEMENTATION_STATUS.md).

### DOCX Form Extraction

The API saves uploaded template drafts and accepted fields in PostgreSQL and stores the original DOCX files in `STORAGE_LOCAL_DIR` with `STORAGE_BACKEND=local`. Use the same storage directory when restarting the API or importing older drafts.

If you used the SQLite prototype, run the one-time import from `apps/api/` after upgrading and seeding PostgreSQL. Use the path to your SQLite file and the UID of the account that should own the imported drafts. The seeded development account uses `dev-user-001`.

```bash
python -m app.modules.templates.import_legacy ./data/form-generations.sqlite3 --owner-uid dev-user-001
```

The importer reads the SQLite file in read-only mode and preserves generation IDs and revisions. You can rerun it after an interruption. It reports entries whose DOCX is missing or fails its checksum and skips those entries.
