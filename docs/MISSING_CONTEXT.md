# CS300 — Context Index, Workflow & Remaining Gaps

**Snapshot:** 2026-11-14  
**Purpose:** Index the authoritative repository documentation, define the vertical-slice implementation workflow, and track the remaining missing specifications for coding agents and developers. The team's strategy is **product-first, decision-driven, test-backed**.

## 0. Repository `docs/` structure

```text
docs/
├── MISSING_CONTEXT.md                        # Context index, workflow & remaining gaps
├── requirements/                             # Baseline requirements converted from PA02
│   ├── vision.md                             # Vision Docs - Revised (v2.1)
│   ├── use-case-specification.md             # Use-case Specification (v1.1)
│   ├── ui-prototype-pa02.md                  # UI Prototype - PA02 (Aligned Use-Case IDs)
│   └── assets/                               # Extracted diagrams & UI prototype screenshots
├── analysis-and-design/                      # Technical & domain specifications for coding
│   ├── COMMUNICATION_DOMAIN.md               # Authoritative English communication/delegation spec
│   ├── PRESET_DOMAIN.md                      # Authoritative Preset & Template domain spec
│   ├── preset_example.yaml                   # Reference ND30/2020 preset YAML (schema v2)
│   ├── database-overview.md                  # Logical ER models (SAD DB component) & Postgres baseline
│   └── adr/                                  # Architecture Decision Records
├── architecture/
│   └── c4/                                   # Proposed C4 model (Overview, C1, C2, C3 Backend/Frontend)
├── management/                               # Live tracking logs
│   ├── IMPLEMENTATION_STATUS.md              # Verified vertical-slice progress
│   ├── DECISIONS.md                          # Resolved design/requirement choices (DEC-*)
│   └── ISSUES.md                             # Open conflicts & questions (ISS-*)
└── test/                                     # Acceptance criteria & verification notes
```

## 1. Current baseline documents

| Document | Role | Source-of-truth guidance |
| :--- | :--- | :--- |
| [`requirements/vision.md`](requirements/vision.md) (`v2.1`) | High-level user/product requirements, features A1–A13 and B1–B10, NFRs | Product scope; do not silently remove high-priority features. Cloud target adopted per [`DEC-002`](management/DECISIONS.md). |
| [`requirements/use-case-specification.md`](requirements/use-case-specification.md) (`v1.1`) | Detailed external behavior across Groups A, B, and C | Functional behavior baseline; derive concrete API/DB contracts per slice. |
| [`requirements/ui-prototype-pa02.md`](requirements/ui-prototype-pa02.md) | User interactions and UC-to-screen mapping | Reference UX; does not override functional requirements. |
| [`analysis-and-design/COMMUNICATION_DOMAIN.md`](analysis-and-design/COMMUNICATION_DOMAIN.md) | Consolidated English communication, delegation, snapshot, and `Apply` rules | Authoritative coding baseline for Group B (integrates `DEC-005`–`DEC-007`; open items `D1`, `D4` tracked in [`ISSUES.md`](management/ISSUES.md)). |
| [`analysis-and-design/PRESET_DOMAIN.md`](analysis-and-design/PRESET_DOMAIN.md) & [`preset_example.yaml`](analysis-and-design/preset_example.yaml) | Preset YAML schema (`core`, `advanced`, `document_types`, `unruled`, `evidence`), MVP renderer scope, and dual template modes | Authoritative coding baseline for Group A & C ([`DEC-008`](management/DECISIONS.md)). |
| [`analysis-and-design/database-overview.md`](analysis-and-design/database-overview.md) | Logical ER diagrams (overall + 5 sub-domains), entity/attribute specs, and PostgreSQL indexing/concurrency rules | Authoritative DB design baseline for PA03 SAD and SQLAlchemy migrations ([`DEC-009`](management/DECISIONS.md)). |
| [`architecture/c4/README.md`](architecture/c4/README.md) | Client–Server + Three-Tier + Modular Monolith architecture and C1–C3 diagrams | Proposed technical architecture baseline ([`DEC-001`](management/DECISIONS.md) – [`DEC-004`](management/DECISIONS.md)). |
| [`../GLOSSARY.md`](../GLOSSARY.md) | Canonical domain terminology | Use these exact terms across code, DB tables, APIs, and tests. |

**Priority when documents disagree:** log the conflict in [`management/ISSUES.md`](management/ISSUES.md) and record the chosen rule in [`management/DECISIONS.md`](management/DECISIONS.md). Do not pretend unverified prototype code or UI mockups override requirements.

## 2. Recommended implementation workflow

1. Select a narrow vertical slice and trace it to the relevant Vision feature(s) and Use Case ID(s).
2. Read the baseline documents above and only the domain details needed for that slice.
3. If blocked by a conflict or ambiguity: log an issue in [`management/ISSUES.md`](management/ISSUES.md), propose a decision in [`management/DECISIONS.md`](management/DECISIONS.md), get review where needed, and document the chosen rule. Do **not** silently invent scope or permissions.
4. Implement with automated tests next to the code; update [`management/IMPLEMENTATION_STATUS.md`](management/IMPLEMENTATION_STATUS.md) **only** with verified evidence from this repository.
5. Keep `requirements/` copies stable; maintain live logs in `management/` and technical specs in `analysis-and-design/`.

**Do not create upfront:** a redundant full SRS, a rewritten Vision, an exhaustive duplicate use-case catalogue, or competing architecture documents. Add targeted specifications only when an implementation slice needs them.

## 3. Remaining missing / insufficient context — prioritized

| Priority | Gap | Minimum viable artifact or action | When needed |
| :--- | :--- | :--- | :--- |
| **P0 — open decision** | **Workspace administration & cross-workspace verification (`D1` / [`ISS-004`](management/ISSUES.md))**. | Record a concise rule in `DECISIONS.md` and `COMMUNICATION_DOMAIN.md` for workspace creation, member roles, and superior–internal workspace subtask authorization. | Before implementing Workspace & Subtask authorization. |
| **P1 — not that much** | **Task cancellation, reassignment & overdue lifecycle rules (`D4` / [`ISS-005`](management/ISSUES.md))**. | Define state transitions and permission rules for cancelling tasks, reassigning assignees, and handling overdue submissions. | Before implementing task cancellation/reassignment flows. |
| **P1 — not that much** | **Verified API & persistent database schema contracts**. | Establish `docs/analysis-and-design/database-overview.md` (logical ERD) and derive OpenAPI / SQLAlchemy migrations slice by slice. | Before / during backend & frontend slice integration. |
| **P1 — not that much** | **Acceptance criteria and automated test traceability**. | Add scenario/integration tests tagged by Vision/UC ID alongside each vertical slice (prioritizing immutable `Submission`, workspace/field isolation, manual `Apply` provenance, and DOCX/PDF rendering). | For each completed vertical slice. |
| **P2 — defer** | **Measurable NFR thresholds & B3 (Deadline Reminders) detailed spec**. | Define concrete performance/fidelity thresholds during stabilization; specify B3 timing/channel only when reminder scheduling enters scope ([`DEC-003`](management/DECISIONS.md)). | Post-MVP / stabilization. |
