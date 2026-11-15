# Database Design & ER Model Overview (DB Component — SAD)

**Status:** Authoritative Logical ER Model & PostgreSQL Schema Baseline (PA03 SAD & MVP Implementation)  
**Grounded in:** [`docs/requirements/vision.md`](../requirements/vision.md), [`docs/requirements/use-case-specification.md`](../requirements/use-case-specification.md), [`PRESET_DOMAIN.md`](PRESET_DOMAIN.md), [`COMMUNICATION_DOMAIN.md`](COMMUNICATION_DOMAIN.md), and [`docs/architecture/c4/README.md`](../architecture/c4/README.md).

---

## 1. Purpose & Alignment with C4 Architecture

In the C4 Container and Backend Component diagrams (`AD-02`, `AD-03`, `AD-04`, `AD-07`), persistent state is split across two storage containers:

1. **PostgreSQL Relational Database (`Persistence & File Gateways` component)**: Stores all structured metadata, workspace memberships, versioned presets and templates, typed form fields, mutable drafts, task/subtask assignments, immutable submission snapshots, reviews, provenance logs, and task discussions.
2. **Document File Store (Cloudflare R2 / Local File Storage)**: Stores binary `.docx` and `.pdf` files (uploaded source templates,regulation files, rendered previews, and exported snapshots). PostgreSQL never stores large binary blobs; it references files through the `file_artifacts` entity.

### PostgreSQL Physical Design Standards (`supabase-postgres-best-practices`)

- **Identifiers**: Unquoted lowercase `snake_case` for all table, column, index, and constraint names.
- **Primary Keys**: `bigint generated always as identity primary key` across all entities for sequential B-tree locality and low index overhead; human-readable identifiers (`slug`, `public_code`) carry `UNIQUE` constraints where exposed in the UI.
- **Data Types**:
  - Timestamps: `timestamptz` (timezone-aware UTC).
  - Strings: `text` (with `CHECK` constraints where bounded), avoiding arbitrary `varchar(n)`.
  - Structured Trees / Flexible Payloads: `jsonb` for Preset blocks (`core`, `advanced`, `document_types`, `unruled`, `evidence`), field bindings/checklists, and draft/submission field values.
  - Status & Type Enums: `text` with `CHECK (... IN (...))` constraints for safe schema evolution.
- **Organizational Continuity (`Vision §5`)**: User records are soft-deactivated (`is_active = false`) rather than hard-deleted (`ON DELETE RESTRICT` on user foreign keys) so historical tasks, drafts, and submissions remain intact when personnel change.

---

## 2. Sub-Domain Organization & Bridge Relationships

To keep modules cohesive and loosely coupled, the schema is organized into **5 sub-domains**:

```mermaid
flowchart LR
    G1["1. Identity, Workspace & Files<br/>(users, workspaces, workspace_members, file_artifacts)"]
    G2["2. Preset & Template<br/>(formatting_presets, document_templates, template_fields)"]
    G3["3. Document Draft<br/>(document_drafts, render_snapshots)"]
    G4["4. Task & Delegation<br/>(tasks, task_field_scopes, task_assignments)"]
    G5["5. Submission, Review, Apply & Audit<br/>(submissions, submission_reviews, field_apply_logs, field_apply_sources, task_comments, activity_events)"]

    G1 -- "user_id, workspace_id, artifact_id" --> G2
    G1 -- "owner_id, artifact_id" --> G3
    G2 -- "template_id" --> G3
    G2 -- "template_id" --> G4
    G3 -- "draft_id (1:1 per assignment)" --> G4
    G4 -- "task_id, assignment_id" --> G5
    G5 -. "Apply provenance: parent_draft_id" .-> G3
```

- **Sub-domains 1 + 2 + 3** operate independently to support **Group A** (Preset/Template authoring & Form filling) and **Group C** (Personal Documents `UC-C01–UC-C03`).
- **Sub-domains 4 + 5** extend the workflow for **Group B** (Workspace task assignment, field-scoped subtask delegation, immutable submissions, reviews, and manual synthesis `UC-B01–UC-B08`).

---

## 3. Complete ER Diagram (SAD Overview)

```mermaid
erDiagram
    users ||--o{ workspace_members : "belongs_to"
    workspaces ||--o{ workspace_members : "has_members"
    users ||--o{ file_artifacts : "uploads"

    formatting_presets ||--o{ formatting_presets : "extends"
    formatting_presets ||--o{ document_templates : "styles"
    file_artifacts ||--o{ document_templates : "source_docx"
    document_templates ||--o{ template_fields : "contains"

    document_templates ||--o{ document_drafts : "instantiates"
    users ||--o{ document_drafts : "owns"
    document_drafts ||--o{ render_snapshots : "rendered_from"
    submissions ||--o{ render_snapshots : "rendered_from"
    file_artifacts ||--o{ render_snapshots : "output_file"

    workspaces ||--o{ tasks : "scopes"
    document_templates ||--o{ tasks : "uses_template"
    tasks ||--o{ task_field_scopes : "scopes_fields"
    template_fields ||--o{ task_field_scopes : "scoped_field"
    tasks ||--o{ task_assignments : "assigns"
    users ||--o{ task_assignments : "assigned_to"
    document_drafts ||--o| task_assignments : "working_copy"
    task_assignments ||--o{ tasks : "delegates_subtasks"

    task_assignments ||--o{ submissions : "captures"
    submissions ||--o| submission_reviews : "reviewed_by"
    document_drafts ||--o{ field_apply_logs : "applied_into"
    field_apply_logs ||--|{ field_apply_sources : "cites"
    submissions ||--o{ field_apply_sources : "source_for"
    tasks ||--o{ task_comments : "discusses"
    workspaces ||--o{ activity_events : "audits"
    tasks ||--o{ activity_events : "logs_events"
```

---

## 4. Sub-Domain ER Models & Entity Specifications

### 4.1. Sub-Domain 1: Identity, Workspaces & File Artifacts

Supports authentication (`Firebase Auth`), two-tier workspace isolation (`Vision B6`, `B10`, `COMMUNICATION_DOMAIN.md §3`), and object-storage file metadata (`AD-03`).

```mermaid
erDiagram
    users ||--o{ workspace_members : "joins"
    workspaces ||--o{ workspace_members : "contains"
    users ||--o{ workspaces : "creates"
    users ||--o{ file_artifacts : "uploads"

    users {
        bigint id PK
        text firebase_uid UK
        text email UK
        text display_name
        boolean is_active
        timestamptz created_at
    }
    workspaces {
        bigint id PK
        text slug UK
        text name
        bigint created_by FK
        timestamptz created_at
    }
    workspace_members {
        bigint id PK
        bigint workspace_id FK
        bigint user_id FK
        text role "admin | member"
        boolean can_assign
        timestamptz joined_at
    }
    file_artifacts {
        bigint id PK
        text storage_key UK
        text original_filename
        text mime_type
        bigint byte_size
        text sha256
        bigint uploaded_by FK
        timestamptz created_at
    }
```

| Entity | Key Attributes & Constraints | Relationships & Domain Rules |
| :--- | :--- | :--- |
| **`users`** | `id` (PK), `firebase_uid` (UK, NOT NULL), `email` (UK, NOT NULL), `display_name`, `is_active` (default `true`), `created_at` | Represents authenticated users. Note: `Assigner` and `Assignee` are contextual per task, never stored as a fixed role on `users`. |
| **`workspaces`** | `id` (PK), `slug` (UK), `name` (NOT NULL), `created_by` (FK → `users.id`), `created_at` | Collaboration boundary isolating tasks, members, and discussions (`I4`). |
| **`workspace_members`** | `id` (PK), `workspace_id` (FK → `workspaces.id` ON DELETE CASCADE), `user_id` (FK → `users.id` ON DELETE RESTRICT), `role` (`admin` \| `member`), `can_assign` (`boolean`), `UNIQUE (workspace_id, user_id)` | Controls who can view workspace tasks and who may create tasks/subtasks inside that workspace (`UC-B01`, `UC-B03`). |
| **`file_artifacts`** | `id` (PK), `storage_key` (UK, NOT NULL), `original_filename`, `mime_type`, `byte_size`, `sha256`, `uploaded_by` (FK → `users.id`), `created_at` | Metadata pointer for every binary file in R2/Local storage (uploaded DOCX templates, regulation PDFs, rendered previews, exported snapshots). |

---

### 4.2. Sub-Domain 2: Formatting Presets, Document Templates & Fields

Realizes `Vision A1–A7`, `UC-A01–UC-A05`, and [`PRESET_DOMAIN.md`](PRESET_DOMAIN.md).

```mermaid
erDiagram
    formatting_presets ||--o{ formatting_presets : "extends"
    formatting_presets ||--o{ document_templates : "styles"
    document_templates ||--o{ template_fields : "defines"

    formatting_presets {
        bigint id PK
        text slug
        int version
        text name
        boolean is_builtin
        bigint parent_preset_id FK "-> formatting_presets.id (nullable)"
        bigint source_artifact_id FK "-> file_artifacts.id (nullable)"
        text status "reviewing | published"
        jsonb core
        jsonb advanced
        jsonb document_types
        jsonb unruled
        jsonb evidence "loaded only during review"
        bigint created_by FK "-> users.id"
        timestamptz created_at
    }
    document_templates {
        bigint id PK
        bigint workspace_id FK "-> workspaces.id (nullable)"
        bigint owner_id FK "-> users.id"
        text slug "stable family identifier"
        text name
        int version
        text status "draft | published | archived"
        text source_type "preset | uploaded_docx"
        bigint preset_id FK "-> formatting_presets.id (nullable)"
        text document_type_key "e.g. quyet_dinh, cong_van"
        bigint source_artifact_id FK "-> file_artifacts.id (nullable)"
        jsonb org_constants
        jsonb locked_segments
        boolean checklist_approved
        timestamptz created_at
    }
    template_fields {
        bigint id PK
        bigint template_id FK "-> document_templates.id"
        text field_key
        text label
        text field_type "short_text | long_text | date | number | amount_of_money | choice"
        boolean is_required
        text instructions
        int display_order
        jsonb bindings "1 or more document positions"
        jsonb automatic_rules "deterministic length/range/format rules"
        jsonb semantic_criteria "LLM criteria for this field"
    }
```

| Entity | Key Attributes & Constraints | Relationships & Domain Rules |
| :--- | :--- | :--- |
| **`formatting_presets`** | `id` (PK), `slug` (NOT NULL), `version` (NOT NULL), `UNIQUE (slug, version)`, `parent_preset_id` (self-FK), `status` (`reviewing` \| `published`), `core`, `advanced`, `document_types`, `unruled`, `evidence` (all `jsonb`) | Saving a preset creates a new immutable `version` (`UC-A01`). Separating `evidence` into its own `jsonb` column allows the Renderer to `SELECT core, advanced, document_types` without loading regulatory quotes. |
| **`document_templates`** | `id` (PK), `owner_id` (FK → `users.id`), `workspace_id` (nullable FK → `workspaces.id`), `slug` (NOT NULL), `version` (NOT NULL), `UNIQUE (slug, version)`, `status` (`draft` \| `published` \| `archived`), `source_type` (`preset` \| `uploaded_docx`), `preset_id` (nullable FK), `source_artifact_id` (nullable FK), `org_constants` (`jsonb`), `locked_segments` (`jsonb`), `checklist_approved` (`boolean`) | Supports both preset-generated skeletons (`source_type = 'preset'`) and uploaded DOCX files (`source_type = 'uploaded_docx'`, `UC-A02`). `slug` groups all versions of the same template family; tasks and drafts bind to a specific `document_templates.id` version row. |
| **`template_fields`** | `id` (PK), `template_id` (FK → `document_templates.id` ON DELETE CASCADE), `field_key` (NOT NULL), `UNIQUE (template_id, field_key)`, `UNIQUE (template_id, id)`, `label`, `field_type`, `is_required`, `instructions`, `display_order`, `bindings` (`jsonb`), `automatic_rules` (`jsonb`), `semantic_criteria` (`jsonb`) | Stores typed fields configured in `UC-A03` and checklist rules approved in `UC-A04`. `bindings` is a JSON array because one field can map to multiple positions in the document. |

---

### 4.3. Sub-Domain 3: Document Drafts (Shared by Tasks & Personal Documents)

Realizes `Vision A8–A13`, `UC-A06–UC-A09` (Guided Form Filling, Live Preview, Content Check, Correction Suggestions, Export) and `UC-C01–UC-C03` (Personal Documents).

```mermaid
erDiagram
    document_templates ||--o{ document_drafts : "instantiates"
    users ||--o{ document_drafts : "owns"
    document_drafts ||--o{ render_snapshots : "rendered_as"
    file_artifacts ||--o{ render_snapshots : "output_file"

    document_drafts {
        bigint id PK
        bigint template_id FK "-> document_templates.id"
        bigint owner_id FK "-> users.id"
        text title
        boolean is_personal "true for UC-C01..C03"
        jsonb field_values "map of field_key -> current value"
        jsonb last_check_result "cached UC-A07/A08 findings & suggestions"
        int version "optimistic concurrency counter"
        timestamptz deleted_at "nullable soft-delete for personal docs"
        timestamptz created_at
        timestamptz updated_at
    }
    render_snapshots {
        bigint id PK
        bigint draft_id FK "-> document_drafts.id (nullable)"
        bigint submission_id FK "-> submissions.id (nullable)"
        int source_draft_version "draft version rendered (draft source only)"
        text format "docx | pdf"
        text purpose "preview | draft_export | final_export"
        bigint artifact_id FK "-> file_artifacts.id"
        timestamptz rendered_at
    }
```

| Entity | Key Attributes & Constraints | Relationships & Domain Rules |
| :--- | :--- | :--- |
| **`document_drafts`** | `id` (PK), `template_id` (FK → `document_templates.id`), `owner_id` (FK → `users.id`), `title`, `is_personal` (`boolean`), `field_values` (`jsonb`), `last_check_result` (`jsonb`), `version` (`int` default `1`), `deleted_at` (`timestamptz` nullable) | Single unified working-copy entity for both **Personal Documents** (`is_personal = true`) and **Task Assignments** (`is_personal = false`). `version` increments on every autosave or `Apply` to prevent lost updates. Editable fields are not stored here; they are derived from the owning Task's `task_field_scopes` (all template fields for personal documents and Parent Tasks). |
| **`render_snapshots`** | `id` (PK), `draft_id` (nullable FK → `document_drafts.id`), `submission_id` (nullable FK → `submissions.id`), `source_draft_version`, `format` (`docx` \| `pdf`), `purpose` (`preview` \| `draft_export` \| `final_export`), `artifact_id` (FK → `file_artifacts.id`), `rendered_at`, `CHECK ((draft_id IS NULL) <> (submission_id IS NULL))` | Append-only record of each output from the authoritative rendering pipeline (`UC-A06` preview, `UC-A09` export). Exactly one source is set. One draft or submission can have many outputs (DOCX and PDF, repeated renders) without updating the source row, which keeps `submissions` immutable (`I1`). |

---

### 4.4. Sub-Domain 4: Tasks, Recipient Assignments & Subtask Delegation

Realizes `Vision B1, B4, B7, B8, B10`, `UC-B01–UC-B03`, `UC-B08`, and [`COMMUNICATION_DOMAIN.md §§4–5`](COMMUNICATION_DOMAIN.md).

```mermaid
erDiagram
    tasks ||--o{ task_assignments : "assigns_to_recipients"
    task_assignments ||--o{ tasks : "delegates_subtasks"
    tasks ||--o{ task_field_scopes : "scopes_fields"
    document_drafts ||--o| task_assignments : "working_copy"

    tasks {
        bigint id PK
        bigint workspace_id FK "-> workspaces.id"
        bigint assigner_id FK "-> users.id"
        bigint template_id FK "-> document_templates.id"
        bigint parent_assignment_id FK "-> task_assignments.id (null = Parent Task)"
        text title
        text instructions
        timestamptz due_at
        text status "active | cancelled"
        timestamptz created_at
    }
    task_field_scopes {
        bigint task_id FK "-> tasks.id"
        bigint template_id FK "same template as the task"
        bigint template_field_id FK "-> template_fields.id"
        text access_mode "editable | readonly"
    }
    task_assignments {
        bigint id PK
        bigint task_id FK "-> tasks.id"
        bigint assignee_id FK "-> users.id"
        bigint draft_id UK,FK "-> document_drafts.id"
        bigint latest_submission_id FK "-> submissions.id (nullable)"
        text status "assigned | in_progress | submitted | approved | revision_needed | cancelled"
        timestamptz created_at
        timestamptz updated_at
    }
```

| Entity | Key Attributes & Constraints | Relationships & Domain Rules |
| :--- | :--- | :--- |
| **`tasks`** | `id` (PK), `workspace_id` (FK → `workspaces.id`), `assigner_id` (FK → `users.id`), `template_id` (FK → `document_templates.id`), `parent_assignment_id` (nullable FK → `task_assignments.id`), `due_at` (`timestamptz`), `status` (`active` \| `cancelled`), `UNIQUE (id, template_id)` | Models both **Parent Tasks** (`parent_assignment_id IS NULL`) and **Subtasks** (`parent_assignment_id IS NOT NULL`). A Subtask must have at least one `editable` row in `task_field_scopes` (checked in the creating transaction, `UC-B03 A1`). |
| **`task_field_scopes`** | `PRIMARY KEY (task_id, template_field_id)`, `template_id`, `access_mode` (`editable` \| `readonly`), composite FK `(task_id, template_id) → tasks (id, template_id)`, composite FK `(template_id, template_field_id) → template_fields (template_id, id)` | Field scope is an authorization boundary, so it is stored as real rows instead of `text[]`: a field must exist and belong to the Task's template, and cannot be both editable and read-only. `editable` = delegated fields; `readonly` = explicitly shared context. **No uniqueness constraint** is placed across sibling Subtasks because field overlap is explicitly permitted (`DEC-005`). |
| **`task_assignments`** | `id` (PK), `task_id` (FK → `tasks.id`), `assignee_id` (FK → `users.id`), `draft_id` (UK, FK → `document_drafts.id`), `latest_submission_id` (nullable), `status`, `UNIQUE (task_id, assignee_id)`, `UNIQUE (id, task_id, assignee_id)`, composite FK `(id, latest_submission_id) → submissions (assignment_id, id)` | Guarantees **per-recipient independence**: each assignee on a multi-recipient Task or Subtask receives their own `task_assignments` row and their own isolated `document_drafts` row. `latest_submission_id` points to the assignment's newest Submission and is updated by each Submit; `status` follows that Submission only (see §5.2). |

---

### 4.5. Sub-Domain 5: Immutable Submissions, Reviews, Apply Provenance & Discussions

Realizes `Vision B2, B5, B6, B9`, `UC-B04–UC-B07`, and invariants `I1–I5` in [`COMMUNICATION_DOMAIN.md §§5–9`](COMMUNICATION_DOMAIN.md).

```mermaid
erDiagram
    task_assignments ||--o{ submissions : "produces"
    submissions ||--o| submission_reviews : "evaluated_by"
    document_drafts ||--o{ field_apply_logs : "target_of"
    field_apply_logs ||--|{ field_apply_sources : "cites"
    submissions ||--o{ field_apply_sources : "source_for"
    tasks ||--o{ task_comments : "thread"
    submissions ||--o{ task_comments : "feedback_context"
    workspaces ||--o{ activity_events : "audits"
    tasks ||--o{ activity_events : "logs_events"

    submissions {
        bigint id PK
        text public_code UK "e.g. SUB-2026-0412"
        bigint task_id FK "-> tasks.id"
        bigint assignment_id FK "-> task_assignments.id"
        bigint submitted_by FK "-> users.id"
        bigint template_id FK "-> document_templates.id"
        int source_draft_version
        jsonb field_values_snapshot "IMMUTABLE snapshot"
        jsonb verification_summary "check results at submit time"
        timestamptz created_at
    }
    submission_reviews {
        bigint id PK
        bigint submission_id UK,FK "-> submissions.id"
        bigint assignment_id FK "-> task_assignments.id"
        bigint reviewer_id FK "-> users.id"
        text decision "approved | revision_requested"
        text feedback
        timestamptz created_at
    }
    field_apply_logs {
        bigint id PK
        bigint parent_draft_id FK "-> document_drafts.id"
        bigint target_template_field_id FK "-> template_fields.id"
        int parent_draft_version_before
        int parent_draft_version_after
        text apply_mode "direct | combine | rewrite"
        bigint applied_by FK "-> users.id"
        timestamptz applied_at
    }
    field_apply_sources {
        bigint apply_log_id PK,FK "-> field_apply_logs.id"
        bigint source_submission_id PK,FK "-> submissions.id"
    }
    task_comments {
        bigint id PK
        bigint task_id FK "-> tasks.id"
        bigint submission_id FK "-> submissions.id (nullable)"
        bigint author_id FK "-> users.id"
        text body
        timestamptz created_at
    }
    activity_events {
        bigint id PK
        bigint workspace_id FK "-> workspaces.id (nullable)"
        bigint task_id FK "-> tasks.id (nullable)"
        bigint actor_id FK "-> users.id"
        text event_type "TaskAssigned | SubmissionCreated | SubmissionReviewed | FieldApplied | TaskCancelled"
        text entity_type
        bigint entity_id
        jsonb payload
        timestamptz occurred_at
    }
```

| Entity | Key Attributes & Constraints | Relationships & Domain Rules |
| :--- | :--- | :--- |
| **`submissions`** | `id` (PK), `public_code` (UK, NOT NULL), `task_id` (FK), `assignment_id` (FK), `submitted_by` (FK), `template_id` (FK), `source_draft_version`, `field_values_snapshot` (`jsonb`), `verification_summary` (`jsonb`), `created_at`, `UNIQUE (assignment_id, id)`, composite FK `(assignment_id, task_id, submitted_by) → task_assignments (id, task_id, assignee_id)`, composite FK `(task_id, template_id) → tasks (id, template_id)` | **Strictly Immutable (`I1`)**: Captures a point-in-time snapshot when an Assignee clicks Submit (`UC-B04`). No `updated_at` column exists; rows are never mutated after insert, and the underlying `document_drafts` row remains unlocked. The snapshot contains only the fields the Assignee was authorized to edit. The composite FKs make the database reject a Submission whose Task, Assignment, submitter or Template disagree. Exported files are recorded in `render_snapshots`, never on this row. |
| **`submission_reviews`** | `id` (PK), `submission_id` (UK, FK → `submissions.id`), `assignment_id` (FK → `task_assignments.id`), `reviewer_id` (FK → `users.id`), `decision` (`approved` \| `revision_requested`), `feedback`, `created_at`, composite FK `(assignment_id, submission_id) → submissions (assignment_id, id)` | Each Submission receives at most one decision (`UC-B05`) and always binds to a specific `submission_id`, never to the live `DocumentDraft`. Only the assignment's `latest_submission_id` may be reviewed (§5.2). Approving a child submission updates the child `task_assignments.status` but never auto-submits or approves the Parent Task (`I2`). |
| **`field_apply_logs`** | `id` (PK), `parent_draft_id` (FK → `document_drafts.id`), `target_template_field_id` (FK → `template_fields.id`), `parent_draft_version_before` (`int`), `parent_draft_version_after` (`int`), `apply_mode` (`direct` \| `combine` \| `rewrite`), `applied_by` (FK → `users.id`), `applied_at` | Append-only record whenever a Parent Assignee applies delegated results into a Parent `DocumentDraft` field (`UC-B06`, `I3`). |
| **`field_apply_sources`** | `apply_log_id` (FK → `field_apply_logs.id` ON DELETE CASCADE), `source_submission_id` (FK → `submissions.id`), `PRIMARY KEY (apply_log_id, source_submission_id)` | Links each `field_apply_logs` entry to one or more source Child Submissions (supporting `direct`, `combine`, and `rewrite`). Backend transaction verifies each source belongs to a Subtask of the Parent Assignment and contains the target field. |
| **`task_comments`** | `id` (PK), `task_id` (FK → `tasks.id`), `submission_id` (nullable FK → `submissions.id`), `author_id` (FK → `users.id`), `body` (NOT NULL), `created_at` | Task-scoped discussion messages (`UC-B07`), isolated within the task's workspace and authorized participants. |
| **`activity_events`** | `id` (PK), `workspace_id` (nullable FK → `workspaces.id`), `task_id` (nullable FK → `tasks.id`), `actor_id` (FK → `users.id`), `event_type` (`text`), `entity_type` (`text`), `entity_id` (`bigint`), `payload` (`jsonb`), `occurred_at` (`timestamptz`) | Append-only business audit trail (`TaskAssigned`, `SubmissionCreated`, `SubmissionReviewed`, `FieldApplied`, `TaskCancelled`, per `COMMUNICATION_DOMAIN.md §10`). Covers lifecycle audit and activity feeds only—not keystroke edits or application logs. |

---

## 5. Indexing & Transaction Rules for Implementation

### 5.1. Mandatory Indexes
1. **Foreign Key Indexes**: Every FK column across all 18 tables must have a B-tree index.
2. **Composite Indexes (Equality before Range/Sort)**:
   - `tasks (workspace_id, status, due_at)` — Workspace task dashboard & overdue filter (`UC-B08`).
   - `task_assignments (assignee_id, status, updated_at desc)` — Assignee task list (`UC-B02`).
   - `submissions (assignment_id, created_at desc)` — Per-recipient submission history (`UC-B05`).
   - `task_comments (task_id, created_at asc)` — Task discussion feed (`UC-B07`).
   - `activity_events (task_id, occurred_at desc)` & `(workspace_id, occurred_at desc)` — Task/workspace audit timeline (`COMMUNICATION_DOMAIN.md §10`).
3. **Partial Indexes**:
   - `document_drafts (owner_id, updated_at desc) WHERE is_personal = true AND deleted_at IS NULL` — Personal document library (`UC-C03`).
   - `tasks (parent_assignment_id) WHERE parent_assignment_id IS NOT NULL` — Fast lookup of delegated Subtasks for a Parent Assignment (`UC-B03`, `UC-B06`).

### 5.2. Transaction & Concurrency Rules
1. **Short Transactions Only (`lock-short-transactions`)**: Never hold an open database transaction or row lock while invoking **LibreOffice Headless** (`UC-A06` preview / `UC-A09` export) or **Ollama LLM** (`UC-A07` semantic check). Read the draft state, close the transaction, run external inference/rendering, then open a millisecond transaction to persist results.
2. **Optimistic Concurrency Control**: Updating `document_drafts` (via autosave `UC-A06` or manual `Apply` `UC-B06`) must check and increment `version`:
   ```sql
   update document_drafts
   set field_values = $1, version = version + 1, updated_at = now()
   where id = $2 and version = $3
   returning version;
   ```
   If `0` rows are returned, reject with a `409 Conflict` so the client refreshes before overwriting (`UC-B06 A2`).

3. **Submit & Review Ordering**: Both operations first lock the assignment row (`SELECT ... FROM task_assignments WHERE id = $1 FOR UPDATE`).
   - **Submit** inserts the new `submissions` row, then sets `task_assignments.latest_submission_id` to it and `status = 'submitted'`. Only `task_assignments` is updated; `submissions` stays immutable.
   - **Review** is accepted only if `submission_id = latest_submission_id`; otherwise reject with `409 Conflict` ("a newer Submission exists"). Reviews of earlier Submissions remain as history. `task_assignments.status` is derived from the latest Submission only, so reviewing out of order cannot overwrite it.
