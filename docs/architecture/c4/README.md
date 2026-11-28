# Document: Fill and Deliver — Software Architecture & C4 Diagrams

**CS300 PA02 — Group 7**  
**Status: proposed architecture baseline; not evidence of a deployed production system.**

## Deliverables

| Folder | Diagram | Scope | Source formats |
|---|---|---|---|
| `01_Architecture_Overview/` | Architecture Overview | Client–Server + Three-Tier Layered + Modular Monolith; relationships across logical layers | PNG, Markdown description |
| `02_C1_System_Context/` | C1: System Context | Main people and external authentication / optional LLM systems | PNG, SVG, DOT |
| `03_C2_Container/` | C2: Container | Web Application, API Application, PostgreSQL and file storage | PNG, SVG, DOT |
| `04_C3_Backend_Component/` | C3: Backend Component | Components **inside API Application** with external dependencies | PNG, SVG, DOT |
| `05_C3_Frontend_Component/` | C3: Frontend Component | Components **inside Web Application** with external dependencies | PNG, SVG, DOT |

## Read the diagrams in this order

1. **Architecture Overview:** High-level style / logical layers for project communication.
2. **C1 Context:** Who uses the product? What external systems does it depend on?
3. **C2 Container:** Which separately runnable applications or data stores make up the product and how do they communicate?
4. **C3 Backend Component:** Which cohesive components exist **inside FastAPI**?
5. **C3 Frontend Component:** Which cohesive components exist **inside React**?

> C4 `Container` does **not** mean a Docker container. It means an application or data store. This proposal uses one deployable FastAPI backend (modular monolith); its domain modules are components, **not microservices**.

## Conventions and important constraints

- **System boundary:** React web application, FastAPI API, PostgreSQL and a document file store belong to the product's logical system. Firebase Auth and Ollama inference are **external software systems**.
- **Technology stack:** React/TypeScript/Vite, FastAPI/Python, PostgreSQL, and Firebase authentication derive from the team's Technology Stack; Cloudflare Pages, VPS/Docker, R2/local storage and Ollama availability are proposed and not asserted as a completed deployment.
- **Identity flow:** Browser signs in through Firebase; backend verifies the incoming ID token and enforces workspace/task/field authorization against data in PostgreSQL.
- **Document flow:** Engine runs as a component within the API backend for the MVP. Complex document conversion should be isolated at runtime for safety; no separate service is asserted.
- **Submission semantics:** Each assignee has an independent draft; Submit creates an immutable snapshot and **does not lock the draft**.
- **Delegation semantics:** Subtasks contain a selected subset of parent form fields; child submissions do **not** auto-merge into the parent. Authorized manual Apply requires provenance and concurrency checks.
- **LLM checks:** Optional advisory semantic verification only; final deterministic validation is performed by backend rules. LLM does not write the content for the user.
- **Relationships:** Arrows indicate direction of the primary request/dependency (responses are implicit). Dashed arrows indicate optional integration. The C3 diagrams display main dependencies rather than every internal call.
- **Scope:** Frontend IndexedDB/Dexie cache and some notification features may be deferred for MVP. Team should freeze actual implementation decisions before presenting these as implemented.

## Rendering/editing

C1, C2 and C3 DOT files are editable with Graphviz. For example:

```bash
dot -Tsvg 02_C1_System_Context/C1_System_Context.dot -o 02_C1_System_Context/C1_System_Context.svg
dot -Gdpi=140 -Tpng 03_C2_Container/C2_Container.dot -o 03_C2_Container/C2_Container.png
```

The previous Architecture Overview was available only as PNG, so it is included as an image with a Markdown specification rather than asserting a native source file exists.

## Source documents and grounding

- [`docs/requirements/vision.md`](../../requirements/vision.md) — Vision Document (v2.1)
- [`docs/requirements/use-case-specification.md`](../../requirements/use-case-specification.md) — Use-Case Specification (v1.1)
- [`docs/analysis-and-design/PRESET_DOMAIN.md`](../../analysis-and-design/PRESET_DOMAIN.md) — Preset & Template Domain Specification
- [`docs/analysis-and-design/COMMUNICATION_DOMAIN.md`](../../analysis-and-design/COMMUNICATION_DOMAIN.md) — Communication & Delegation Domain Specification
- [`docs/analysis-and-design/database-overview.md`](../../analysis-and-design/database-overview.md) — Database Design & ER Model Overview
- [`docs/management/DECISIONS.md`](../../management/DECISIONS.md) & [`docs/management/ISSUES.md`](../../management/ISSUES.md) — Live Decision and Issue Logs

## Tracked design decisions

- Deployment target (Cloudflare Pages, VPS/Docker, R2, Firebase Auth with local-dev fallback), LibreOffice subprocess isolation, and Tiptap form-field scope are recorded in [`docs/management/DECISIONS.md`](../../management/DECISIONS.md) (`DEC-001`–`DEC-009`).
- PDF conversion runs LibreOffice as a bounded local subprocess by default (`DEC-003`). When `RENDER_SERVICE_URL` is set, the API instead calls the optional self-hosted Gotenberg `renderer` container (`docker-compose.yml`), which runs LibreOffice, with no fallback to the local subprocess (`DEC-022`). The C2 and C3 diagrams label the engine as LibreOffice and do not draw this optional container.
- Remaining open questions are tracked in [`docs/management/ISSUES.md`](../../management/ISSUES.md).
