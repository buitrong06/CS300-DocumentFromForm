# AGENTS.md — Document: Fill and Deliver Engineering Guide

> **Purpose:** Single source of truth for AI coding agents (Claude Code, Cursor, Windsurf, Copilot, Antigravity) working in this repository. Humans: see [README.md](README.md). Read this file before planning, editing, or refactoring any code.

---

## 1. System Overview & Architecture

**Document: Fill and Deliver** is a Vietnamese administrative & organizational document preparation, guided form-filling, validation, hierarchical task-delegation, snapshot review, and authoritative DOCX/PDF export platform (supporting regulations such as Decree 30/2020/ND-CP and Youth Union formats).

- **Architecture Baseline ([`docs/architecture/c4/README.md`](docs/architecture/c4/README.md), [`DEC-001`](docs/management/DECISIONS.md)–[`DEC-004`](docs/management/DECISIONS.md)):**
  - **Backend (`apps/api/`):** Python 3.12 + FastAPI **Modular Monolith** organized around C3 Backend components (`presets`, `templates`, `drafts`, `tasks`, `submissions`, `workspaces`, `rendering`, `llm`, `auth`).
  - **Frontend (`apps/web/`):** React + TypeScript + Vite organized by **Feature Folders** (`src/app/` shell & session, `src/shared/` common UI & API client, `src/features/<slice>/` per vertical slice).
  - **Infrastructure:** PostgreSQL 16 (structured metadata, `JSONB` preset/field payloads, immutable snapshots — [`DEC-009`](docs/management/DECISIONS.md), [`DEC-010`](docs/management/DECISIONS.md)), Local File Storage / Cloudflare R2 (`file_artifacts` for binary `.docx`/`.pdf`), LibreOffice Headless for PDF preview/export (bounded local subprocess by default — [`DEC-003`](docs/management/DECISIONS.md); optional self-hosted Gotenberg `renderer` container when `RENDER_SERVICE_URL` is set, with no fallback — [`DEC-022`](docs/management/DECISIONS.md)), Firebase Authentication (with local-dev auth bypass during Week 0 — [`DEC-013`](docs/management/DECISIONS.md)), and optional Ollama-compatible LLM (advisory semantic feedback only).

---

## 2. Repository Map & Reading Order

```text
.
├── AGENTS.md                                      # Global rules, invariants & verification commands (this file)
├── GLOSSARY.md                                    # Canonical domain vocabulary (use exact terms everywhere)
├── README.md                                      # Human developer overview & quick start
├── .env.example                                   # Environment variable template (never commit .env)
├── .github/
│   ├── pull_request_template.md                   # Required PR sections (Summary, Why this design, Verification)
│   └── workflows/ci.yml                           # Automated CI gate
├── apps/
│   ├── api/                                       # FastAPI modular-monolith backend (Python 3.12)
│   └── web/                                       # React + TypeScript + Vite frontend
├── docs/
│   ├── MISSING_CONTEXT.md                         # Baseline index, workflow & remaining gaps
│   ├── requirements/                              # Vision (v2.1), Use-Case Specification (v1.1), UI Prototype
│   ├── analysis-and-design/                       # Authoritative coding & DB specifications:
│   │   ├── PRESET_DOMAIN.md                       #   Group A/C: Preset YAML schema, renderer scope, dual template modes
│   │   ├── preset_example.yaml                    #   Reference ND30/2020 preset YAML
│   │   ├── COMMUNICATION_DOMAIN.md                #   Group B: Workspaces, delegation, immutable submissions, Apply
│   │   ├── database-overview.md                   #   Complete ER model (18 tables across 5 sub-domains) & SQL rules
│   │   └── adr/                                   #   Architecture Decision Records
│   ├── architecture/c4/                           # C1–C3 architecture diagrams & component boundaries
│   ├── management/                                # Live tracking logs:
│   │   ├── IMPLEMENTATION_STATUS.md               #   Verified vertical-slice progress
│   │   ├── DECISIONS.md                           #   Resolved design/requirement choices (DEC-001..DEC-013)
│   │   ├── ISSUES.md                              #   Conflict & ambiguity log (ISS-*)
│   │   └── WEEK0_CONTRACT_FIRST_SETUP.md          #   Week 0 contract-first & golden-path setup plan
│   └── test/                                      # Test plans & acceptance criteria
└── pa/                                            # Course assignment deliverables
```

### Mandatory Reading Order Before Implementing Any Slice
1. [`docs/MISSING_CONTEXT.md`](docs/MISSING_CONTEXT.md) — baseline index, prioritized gaps, and workflow rules.
2. [`GLOSSARY.md`](GLOSSARY.md) — canonical domain vocabulary (never invent synonyms).
3. Relevant requirements in `docs/requirements/` (`vision.md`, `use-case-specification.md`, `ui-prototype-pa02.md`).
4. Relevant technical specs in `docs/analysis-and-design/` (`PRESET_DOMAIN.md`, `COMMUNICATION_DOMAIN.md`, `database-overview.md`) and `docs/architecture/c4/`.
5. Live tracking in `docs/management/` (`DECISIONS.md`, `ISSUES.md`, `IMPLEMENTATION_STATUS.md`).

**When documents disagree:** log the conflict in [`docs/management/ISSUES.md`](docs/management/ISSUES.md) and propose a resolution in [`docs/management/DECISIONS.md`](docs/management/DECISIONS.md). Do **not** silently invent scope, permissions, or merge rules.

---

## 3. Verification Commands & Workflow

### Commands (keep in sync with `.github/workflows/ci.yml` as `apps/api` and `apps/web` are scaffolded)

```bash
# Backend (inside apps/api):
ruff check . && mypy . && pytest

# Frontend (inside apps/web):
npm run typecheck && npm run lint && npm test && npm run build
```

### Vertical-Slice Workflow
1. Pick a **narrow vertical slice** traced to Vision features (`A1–A13`, `B1–B10`) and Use Case IDs (`UC-*`).
2. Check [`docs/MISSING_CONTEXT.md`](docs/MISSING_CONTEXT.md) and [`docs/management/DECISIONS.md`](docs/management/DECISIONS.md) before coding.
3. Implement backend/frontend changes with unit and integration/scenario tests next to the code.
4. Update [`docs/management/IMPLEMENTATION_STATUS.md`](docs/management/IMPLEMENTATION_STATUS.md) **only** with verified code paths and passing test evidence (never mark mock-only UI as implemented).
5. Changes to shared frontend UI (`apps/web/src/shared/ui/`) or shared OpenAPI contracts require explicit team review ([`WEEK0_CONTRACT_FIRST_SETUP.md`](docs/management/WEEK0_CONTRACT_FIRST_SETUP.md)).

---

## 4. Non-Negotiable Domain Invariants

Violating any rule below is a critical bug:

### Group A & C: Presets, Templates, Form Filling & AI Guardrails
1. **Deterministic Formatting & Authoritative Server Rendering (`A1`, `A2`, `DEC-001`, `DEC-004`, `DEC-008`):**
   - Formatting metrics (margins, fonts, sizes, spacing, tables, rules) are read from or applied via structured `FormattingPreset` blocks (`core`, `advanced`, `document_types`) and DOCX XML on the backend. Never ask an LLM to guess formatting numbers.
   - `Tiptap` is used strictly as a rich-text input widget for formatted fields inside the guided form (`DEC-004`), never as a full-page Word layout editor.
2. **Evidence-Grounded AI Checks (`A3`, `A10`, `UC-A01`, `UC-A07`):**
   - Evaluate `unruled.semantic_criteria` using structured outputs with an exact verbatim `evidence_quote` from the user's input (or cite the exact missing criterion/field).
   - **Mandatory Deterministic Post-Check in Python:** Verify that `evidence_quote` exists in the source text/field value. If not found or confidence is insufficient, automatically downgrade the finding to `UNCERTAIN`.
   - LLM feedback is advisory only and must **NEVER write or rewrite content** for the user.
3. **Export & Scoped Submit Gatekeeper (`A11`, `UC-A09`, `UC-B04 A1`):**
   - Missing `required` fields or failed deterministic rules (`auto_rules`) MUST block **Final Export** (`final_export`) and block **Task Submit**, while still allowing **Draft Export** (`draft_export`).
   - For a **Subtask**, the Submit gatekeeper checks **only** the Subtask's delegated `editable` fields ($S$) in `task_field_scopes`—never blocking a Subtask over fields outside $S$.
   - LLM findings (`semantic_criteria`) are warnings only and NEVER block Final Export or Submit.
4. **Tracked-Change Proofreading Only (`A13`, `UC-A08`):**
   - Suggestions may only fix spelling, typos, punctuation, and Vietnamese administrative conventions (dates, money, document numbers). Never rephrase sentences.
   - Any suggestion touching a **number, date, or proper name** MUST be flagged (`is_sensitive_entity = True`) so the UI highlights it separately for explicit user confirmation.
5. **Dual Template Creation & Personal Document Import (`A5`, `A12`, `DEC-008`):**
   - Templates support both `source_type = 'preset'` (generated from a `FormattingPreset`) and `source_type = 'uploaded_docx'` (preserving original DOCX formatting and detecting fields from `{{markers}}`, Word comments, and blank patterns).
   - Personal documents (`UC-C01`–`UC-C03`) reuse `document_drafts` (`is_personal = true`) without requiring a workspace task.

### Group B: Workspaces, Delegation, Immutable Snapshots & Manual `Apply`
6. **Independent Recipient Assignments & Drafts (`B1`, `B8`, `DEC-005`):**
   - Every recipient on a Task or Subtask receives an independent `task_assignments` row and an isolated `document_drafts` row (`1:1`). Never implement shared drafts or concurrent co-editing on a single working copy.
7. **Immutable Submissions & Latest-Submission Review Ordering (`B2`, `B5`, `B8`, `DEC-010`):**
   - `submissions` is strictly **append-only** (no `UPDATE` or `DELETE`; rendered files are stored in `render_snapshots`).
   - Clicking **Submit** creates a new immutable `Submission` snapshot, updates `task_assignments.latest_submission_id`, and **NEVER locks** the assignee's live `DocumentDraft`.
   - Each `Submission` receives at most one review (`submission_reviews.submission_id` is unique). A review (`approved` or `revision_requested`) is accepted **only if `submission_id = task_assignments.latest_submission_id`** (under row lock); reviewing an outdated snapshot when a newer one exists is rejected with `409 Conflict`.
8. **Workspace & Field-Scope Isolation (`B6`, `B7`, `B10`, `DEC-010`, `DEC-011`):**
   - Every Subtask links directly to its delegating Parent Assignment via `tasks.parent_assignment_id` and stores field permissions in `task_field_scopes (task_id, template_id, template_field_id, access_mode: 'editable' | 'readonly')` with `(task_id, template_field_id)` unique per task.
   - Overlapping editable fields across sibling Subtasks are allowed (emit a non-blocking warning).
   - Cross-workspace Subtask creation is authorized through the acting user (`assignee_id` on `parent_assignment_id` + `can_assign`/`admin` in the target workspace) without exposing the Parent Task or superior workspace to Subtask assignees.
9. **Manual Subtask Integration Only (`B4`, `B7`, `B9`, `B10`, `DEC-010`):**
   - Approving Child Subtasks NEVER auto-updates, auto-submits, or auto-approves the Parent Task.
   - Integrating delegated results into a Parent Draft happens strictly via explicit **`Apply`** actions that check `document_drafts.version` (optimistic locking, `409 Conflict` on mismatch), warn before overwriting non-empty values, and record provenance in `field_apply_logs` (`value_before`, `value_after`, `apply_mode: direct | combine | rewrite`) + `field_apply_sources`.
10. **Short DB Transactions & Organizational Continuity (`DEC-009`, `DEC-012`):**
    - Never hold an open database transaction or row lock while calling LibreOffice Headless (local subprocess or `renderer` service) or Ollama LLM.
    - Never hard-delete historical users, tasks, drafts, or submissions (`users.is_active = false`, `ON DELETE RESTRICT`). Reassigning work cancels the old `task_assignments` row (`status = 'cancelled'`) and creates a new assignment + draft.

---

## 5. Git & Security Hard Rules

1. **Never commit secrets, real user data, `.env` files, or local SQLite/build artifacts.** Use `.env.example` and synthetic test fixtures only.
2. **Never weaken or delete tests to make CI pass.** Every bug fix ships with a regression test.
3. **Never commit directly to `main` or bypass PR review** (unless explicitly instructed by the project lead in session). Use feature branches (`feat/...`, `fix/...`, `docs/...`, `chore/...`) and complete [`.github/pull_request_template.md`](.github/pull_request_template.md).
