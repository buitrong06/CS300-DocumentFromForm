# Document: Fill and Deliver

A web application for Vietnamese administrative and organizational document preparation, guided form filling, deterministic & advisory content checking, hierarchical task delegation, immutable submission review, and authoritative DOCX/PDF export.

## Architecture & Tech Stack

- **Frontend (`apps/web/`)**: React + TypeScript + Vite (Feature-Folder layout: `src/app/`, `src/shared/`, `src/features/<slice>/`)
- **Backend (`apps/api/`)**: Python 3.12 + FastAPI Modular Monolith + SQLAlchemy 2.0 / Alembic
- **Database & Storage**: PostgreSQL 16 (relational metadata, `JSONB` schemas, append-only snapshots) + Local File Storage / Cloudflare R2 (`file_artifacts`)
- **Document & AI Engines**: `python-docx` / `docxtpl` + LibreOffice Headless (authoritative DOCX/PDF rendering) + optional Ollama-compatible LLM (evidence-grounded semantic checks only)
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
2. Review theWeek 0 setup plan in [docs/management/WEEK0_CONTRACT_FIRST_SETUP.md](docs/management/WEEK0_CONTRACT_FIRST_SETUP.md).
3. Review technical specifications:
   - Architecture: [docs/architecture/c4/README.md](docs/architecture/c4/README.md)
   - Preset & Template Domain: [docs/analysis-and-design/PRESET_DOMAIN.md](docs/analysis-and-design/PRESET_DOMAIN.md)
   - Communication & Delegation Domain: [docs/analysis-and-design/COMMUNICATION_DOMAIN.md](docs/analysis-and-design/COMMUNICATION_DOMAIN.md)
   - Database ER Model: [docs/analysis-and-design/database-overview.md](docs/analysis-and-design/database-overview.md)
4. Copy `.env.example` to `.env` for local development.
5. Track verified slice implementation progress in [docs/management/IMPLEMENTATION_STATUS.md](docs/management/IMPLEMENTATION_STATUS.md).
