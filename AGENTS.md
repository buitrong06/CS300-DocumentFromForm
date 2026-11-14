# AGENTS.md

Instructions for AI coding agents working in this repository. Humans: see [README.md](README.md).

## Project in one paragraph

**Document: Fill and Deliver** (CS300-CPThought) is a web application for structured document preparation, form filling, delegation, submission, review, and authoritative DOCX/PDF export. Proposed baseline architecture: **React + TypeScript + Vite** frontend, **FastAPI + Python** modular-monolith backend, **PostgreSQL**, **Firebase Auth**, and optional **Ollama-compatible LLM** advisory checks (see [docs/architecture/c4/README.md](docs/architecture/c4/README.md)).

## Source-of-truth & reading order

Before proposing architecture or implementing any feature slice, read:

1. [docs/MISSING_CONTEXT.md](docs/MISSING_CONTEXT.md) — baseline index, prioritized gaps, and workflow rules.
2. [GLOSSARY.md](GLOSSARY.md) — canonical domain vocabulary (use these exact terms; do not invent synonyms).
3. Relevant requirements in `docs/requirements/` (`vision.md`, `use-case-specification.md`, `ui-prototype-pa02.md`) and domain/database specs in `docs/analysis-and-design/` (`PRESET_DOMAIN.md`, `COMMUNICATION_DOMAIN.md`, `database-overview.md`).
4. Relevant architecture/decisions in `docs/architecture/c4/` and `docs/analysis-and-design/adr/`.
5. Live tracking in `docs/management/` (`IMPLEMENTATION_STATUS.md`, `DECISIONS.md`, `ISSUES.md`).

**When documents disagree:** log the conflict in `docs/management/ISSUES.md` and propose a resolution in `docs/management/DECISIONS.md`. Do **not** silently invent scope, permissions, or merge rules.

## Commands (update as `src/` is scaffolded)

> `src/` is currently uninitialized. When setting up backend/frontend, keep single-command verification scripts here and in `.github/workflows/ci.yml`.

```bash
# Planned verification baseline:
# Backend:  pytest && ruff check . && mypy .
# Frontend: npm run typecheck && npm run lint && npm test && npm run build
```

## Implementation workflow

1. Pick a **narrow vertical slice** traced to Vision features (`A1–A13`, `B1–B10`) and Use Case IDs (`UC-*`).
2. Check `docs/MISSING_CONTEXT.md` for P0 gaps touching that slice; resolve blockers in `DECISIONS.md` before coding.
3. Write tests alongside code (unit tests next to modules; integration/scenario tests tagged by Vision/UC ID).
4. Update `docs/management/IMPLEMENTATION_STATUS.md` **only** with verified code and test evidence from this repository.
5. For architectural decisions that outlive one PR, add an ADR under `docs/analysis-and-design/adr/`.

## Hard rules: never

1. **Never let an LLM rewrite user document content or override deterministic validation.** LLM checks are optional and advisory only; mandatory constraints are enforced deterministically by backend rules.
2. **Never auto-merge child/subtask submissions into a parent draft.** Manual review and explicit Apply with provenance and version/concurrency checks are required.
3. **Never mutate an immutable Submission.** `Submit` creates a new snapshot while leaving the active draft editable.
4. **Never commit secrets, real user data, or `.env` files.** Use `.env.example` and synthetic test fixtures only.
5. **Never weaken or delete tests to make CI pass.** Every bug fix ships with a regression test.
6. **Never commit directly to `main` or bypass PR review.** Use feature branches (`feat/...`, `fix/...`, `docs/...`, `chore/...`) and fill in `.github/pull_request_template.md`.
