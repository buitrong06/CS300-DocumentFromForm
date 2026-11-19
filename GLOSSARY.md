# Domain Glossary

Canonical vocabulary for **Document: Fill and Deliver**. Always use these exact terms in code, schemas, API contracts, tests, and docs. Do not introduce synonyms (e.g., avoid mixing "Form", "Template", and "Blueprint" interchangeably).

> Authoritative domain specifications live in [`docs/analysis-and-design/PRESET_DOMAIN.md`](docs/analysis-and-design/PRESET_DOMAIN.md), [`docs/analysis-and-design/COMMUNICATION_DOMAIN.md`](docs/analysis-and-design/COMMUNICATION_DOMAIN.md), and [`docs/analysis-and-design/database-overview.md`](docs/analysis-and-design/database-overview.md).

## Document & Template Domain

- **FormattingPreset**: Versioned, reusable styling/layout rule set (`core`, `advanced`, `document_types`, `unruled`, `evidence` blocks — e.g. ND30/2020) applied when rendering or validating a document (`DEC-008`).
- **StructureBlueprint**: Logical section/hierarchy definition of a document type independent of a specific user draft (realized by the `document_types` block in `FormattingPreset` and locked structure segments in `DocumentTemplate`).
- **DocumentTemplate**: A versioned, published template combining structure, styling/preset rules, and typed `Field` definitions from which tasks or drafts are created.
- **Field**: A typed, addressable input unit inside a `DocumentTemplate` or `DocumentDraft` (with validation constraints and optional `Binding`).
- **Binding**: Mapping between a `Field` and its anchor/placeholder in a source or generated DOCX structure.
- **DocumentDraft**: An assignee's mutable working copy of form/document values. Supports autosave and stays editable even after creating a `Submission`.
- **RenderSnapshot**: A point-in-time rendered output (DOCX/PDF) produced by the authoritative document-processing pipeline from a template + draft/submission state.

## Task, Delegation & Review Domain

- **Workspace**: An authorization boundary scoping tasks, members, and internal delegation subtasks.
- **Task**: A unit of work created from a published `DocumentTemplate` and assigned to one or more recipients.
- **Assignment**: A recipient's independent instance of a `Task`, owning its own `DocumentDraft`.
- **Subtask**: A delegated child task containing an explicitly selected, non-empty subset of parent `Field`s within an authorized internal `Workspace`.
- **Submission**: An **immutable** snapshot created when an assignee submits a `DocumentDraft` for review (identified by `submission_id`).
- **Apply**: The explicit, authorized action by a parent assignee to copy selected fields from an approved child `Submission` into the parent `DocumentDraft`, with source provenance and optimistic concurrency checks.
