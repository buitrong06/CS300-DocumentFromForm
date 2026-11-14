# CS300 — Missing Context & Implementation Documentation

**Snapshot:** 2026-11-13  
**Purpose:** Document the minimum missing information for a coding agent. This is a gap list, **not** a new approved requirement specification. The team's strategy is **product-first, decision-driven, test-backed**. Do not polish the existing requirements before implementation unless a blocking conflict requires it.

## 0. Repository `docs/` structure

```text
docs/
├── MISSING_CONTEXT.md              # Handoff gap list, baseline index & implementation workflow
├── requirements/                   # Baseline requirements converted from PA02 / Handoff
│   ├── vision.md                   # Vision Docs - Revised (v2.1)
│   ├── use-case-specification.md   # Use-case Specification (v1.1)
│   ├── ui-prototype-pa02.md        # UI Prototype - PA02 (Aligned Use-Case IDs)
│   ├── domain/
│   │   └── communication-concept-v2.md  # Communication Concept - Version 2
│   └── assets/                     # Extracted diagrams & UI prototype screenshots
├── analysis and design/            # Technical & domain specs for code (PRESET_DOMAIN.md, API, data model)
├── architecture/                   # System & client architecture (e.g. client.md)
├── management/                     # Live tracking logs (IMPLEMENTATION_STATUS.md, DECISIONS.md, ISSUES.md)
└── test/                           # Acceptance criteria & verification notes
```

## 1. Current minimal source set

All four current working copies are in `docs/requirements/`:

| Document | Role | Source-of-truth caution |
| :---- | :---- | :---- |
| [`requirements/vision.md`](requirements/vision.md) (`Vision Docs - Revised`, v2.1) | High-level user/product requirements, features A1–A13 and B1–B10, NFRs | Product scope; do not silently remove high-priority features. |
| [`requirements/use-case-specification.md`](requirements/use-case-specification.md) (`Use-case Specification`, v1.1) | Detailed external behavior; 20 UCs in groups A/B/C | Functional behavior; flows/alternatives are not a full API/data design. |
| [`requirements/ui-prototype-pa02.md`](requirements/ui-prototype-pa02.md) (`UI Prototype - PA02 (Aligned Use-Case IDs)`) | User interactions and UC-to-screen mapping | Reference UX, not authority to override requirements. |
| [`requirements/domain/communication-concept-v2.md`](requirements/domain/communication-concept-v2.md) (`Communication Concept - Version 2`) | Communication/delegation model, invariants, open choices | Mixes accepted principles, proposed rules and unresolved decisions. Read status before implementing. |

**Priority when documents disagree:** log the conflict. A team-approved decision may clarify/change a requirement; otherwise treat Vision and Use-case Specification as the baseline. Do not pretend the existing code or the UI prototype proves a requirement is correct.

## 2\. Missing / insufficient context — prioritized

| Priority | Gap | Minimum viable artifact or action | When needed |
| :---- | :---- | :---- | :---- |
| **P0 \- really need** | **One authoritative Preset/Template domain specification** is not in this minimal set. Existing research contains several phases, contracts, candidate implementations and unsupported features, but no concise team-approved implementation baseline. | Consolidate `PRESET_DOMAIN.md`: distinction between FormattingPreset / StructureBlueprint / DocumentTemplate / Field / Binding / DocumentDraft / RenderSnapshot; generated-vs-imported DOCX paths; supported schema/subset; preservation rules; failure behavior; MVP limits. Cite the Phase 2 handoff as a reference, **not** as proof the team repo implements it. | Before implementing Preset/Template engine. |
| **P0 \- dont know** | **Actual implementation status is unknown** from the four documents. Some previous ZIPs are standalone reference prototypes, not verified merges into the team's repository. | Start `IMPLEMENTATION_STATUS.md` in the **actual code repository**, with module/UC, owner, implemented paths, tests, blockers, commit/PR links. | On opening the repository. |
| **P0 \- maybe need** | **Decision and issue tracking is not yet established for coding.** | Create `DECISIONS.md` and `ISSUES.md` in the repo (can start empty). Record conflict, references, proposed choice, approval/status, impact, test changes. Critical permissions/data/scope changes require team approval. | At first conflict; no need to retroactively rewrite all docs. |
| **P0 \- may resolve later** | **Communication domain has open/conflicting areas.** Role and delegation wording, task vs per-recipient assignment, workspace authorization, review/apply and permission edge cases need consistent implementation decisions. | Use current Communication Concept as working material. Resolve each blocker via decision log, then add only accepted rules to a concise `COMMUNICATION_DOMAIN.md` **if the concept becomes hard to use directly**. | Before affected backend behavior. |
| **P1 \- not that much** | **API, persistent data model and cross-module contracts** do not have a verified contract for the team's current implementation. | Derive OpenAPI, data entities, transaction boundaries and error cases from implemented vertical slices; version them alongside code. | When backend/frontend integration begins. |
| **P1 \- not that much** | **Acceptance criteria and test traceability** are incomplete at the whole-product level. Corpus and Phase 2–4 tests exist as research evidence but do not certify the product. | Add scenario tests next to code, tagged by Vision/UC ID. Prioritize immutable Submission, permission isolation, manual Accept & Apply, DOCX/PDF fidelity, autosave and preview/export parity. | For each completed vertical slice. |
| **P1 \- not that much** | **Deployment/architecture NFR conflict.** Vision refers to local deployability; Technology Stack research includes cloud services. An old `Architecture` Google Doc contains only short client notes, not a verified C4 baseline. | Record a deployment decision (local-first versus cloud); update a compact architecture/README once the running system structure is known. | Before infrastructure commitments. |
| **P2 \- no no no** | **NFRs are not consistently measurable.** Reliability, data recovery, access control, performance and document fidelity need verifiable thresholds. | Add tests and thresholds as implementation exposes concrete risks, not a standalone large SRS now. | During stabilization. |
| **P2 \- no no no** | **Vision feature B3 (Deadline Reminders)** has no standalone, detailed use case in current UC specification. | Track as coverage gap; clarify timing, notification channel and behavior only when scheduling/reminder work enters scope. | When implementing reminders. |

3\. Recommended implementation workflow

1. Select a narrow vertical slice, trace it to relevant Vision feature(s) and UC(s).  
2. Read the four baseline documents and any domain detail actually necessary for that slice.  
3. If blocked by a conflict or ambiguity: create an issue, propose a decision, get review where needed, and document the chosen rule. Do **not** silently invent scope or permissions.  
4. Implement with tests; update `IMPLEMENTATION_STATUS.md` only with evidence from the **team repo**.  
5. Keep source copies here stable; maintain live logs and code-adjacent contracts in the repo.

**Do not create now:** a redundant full SRS, a rewritten Vision, a new exhaustive use-case catalogue, multiple competing architecture documents or a large duplicate research folder. Add targeted specifications only when an implementation slice needs them.

## 4\. Research references intentionally kept outside this minimal handoff

The source material is still available under `CS300 Materials / Preset & Template — Document Corpus & Domain Research` and the archived, earlier handoff snapshot. It includes Phase 2 contracts, Phase 3 Gold Corpus reports, Phase 4 spike, MVP v0.5 reference ZIP and test evidence. Retrieve individual items on demand; do not treat standalone experimental PASS claims as a production-ready team implementation.