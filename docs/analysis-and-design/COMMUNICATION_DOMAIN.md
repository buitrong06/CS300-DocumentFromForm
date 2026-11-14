# Communication & Delegation Domain Specification

**Status:** Authoritative implementation baseline for coding and database design  
**Derived from:** [`docs/requirements/vision.md`](../requirements/vision.md) (B1–B10), [`docs/requirements/use-case-specification.md`](../requirements/use-case-specification.md) (UC-B01–UC-B08), and resolved decisions [`DEC-005`](../management/DECISIONS.md), [`DEC-006`](../management/DECISIONS.md), [`DEC-007`](../management/DECISIONS.md).

---

## 1. Purpose and Scope

This specification defines the domain rules for assigning, delegating, completing, submitting, reviewing, and synthesizing template-based documents across organizational workspaces. Communication is strictly task- and document-scoped; it does not provide general-purpose chat.

---

## 2. Contextual Roles: Assigner and Assignee

- **Assigner**: The party that creates a task, selects the template, defines instructions and deadlines, receives submissions, and records review decisions.
- **Assignee**: The party responsible for completing an assigned task, editing the draft, submitting snapshots, and addressing revision feedback.
- **Contextual Nature**: `Assigner` and `Assignee` are **roles within a specific task relationship**, not fixed account types on a user profile. A single user may act as an `Assignee` on a Parent Task in a superior workspace while acting as an `Assigner` of Subtasks in an internal workspace.
- **Accountability Rule**: The Assignee of a Parent Task remains solely accountable to the Parent Task's Assigner for the final Parent submission, regardless of whether fields were delegated to Subtask assignees.

---

## 3. Workspaces and Two-Tier Isolation

- A **Workspace** is an isolated collaboration boundary with its own member list, tasks, and task discussions.
- **Vertical vs. Internal Context**:
  - *Superior Workspace*: An organization or upper unit assigns a Parent Task (e.g., Task `#100`) to department representatives.
  - *Internal Workspace*: A department representative (Parent Assignee) creates Subtasks (e.g., Subtask `#101`) within their internal workspace to delegate selected fields to team members.
- **Access Isolation**: By default, tasks, drafts, submissions, and discussions inside a workspace are visible only to authorized members of that workspace (and workspace administrators). Subtask assignees never automatically gain visibility into the Parent Task, the superior workspace, or other recipients' drafts/submissions.
  - *Note on Workspace Administration & Cross-Workspace Verification (`D1`)*: Detailed rules for who creates workspaces and verifies superior–internal workspace links are tracked as open item [`ISS-004`](../management/ISSUES.md).

---

## 4. Parent–Child Task Delegation

### 4.1. Structure and Cardinality

- Let a Parent Task's form have fillable field set $F$.
- A **Subtask** delegates a **non-empty subset** $S \subseteq F$ (where $S = F$ is permitted). Every Subtask references its `parent_task_id` (or `parent_assignment_id`) and stores its `delegated_field_ids`.
- **Unlimited Subtasks (`DEC-006` / `D3`)**: A Parent Assignee may create any number of Subtasks from a Parent Task. The UI provides filtering and status aggregation so large numbers of Subtasks remain manageable.
- **Multi-Recipient Independence (`DEC-005` / `D2`)**: A Task or Subtask may be assigned to **one or multiple recipients** via separate **Task Assignments**. Each recipient receives an independent `Assignment`, `DocumentDraft`, `Submission` history, `Review` history, and status. There is **no shared draft** and **no concurrent editing** on a single working copy.

### 4.2. Creating and Assigning a Subtask

1. The Parent Assignee opens the Parent Form and initiates **Create Subtask**.
2. They specify the Subtask title and select a non-empty subset $S \subseteq F$ of delegable fields from the Parent Form (fields outside $F$ cannot be selected).
3. They select one or more Assignees within the internal workspace, provide instructions and a deadline, and optionally attach related fields as **explicit read-only context**.
4. Upon confirmation, the system creates the Subtask and one independent `Assignment` + `DocumentDraft` per recipient (restricted to editing only the fields in $S$).
5. Creating a Subtask **does not** modify the Parent Draft, Parent Task status, or Parent Task deadline. If a Subtask deadline is later than the Parent deadline, the system displays a warning without blocking creation.

### 4.3. Field Overlap Policy

- **Overlap Allowed**: Multiple Subtasks under the same Parent Task may delegate overlapping field sets (e.g., Subtask `#101` delegates `{F2, F4}` to X, and Subtask `#102` delegates `{F3, F4}` to Y). The database and backend must **not** enforce disjoint field constraints across Subtasks.
- When creating a Subtask, if a selected field is already delegated in another active Subtask, the system displays an overlap warning and lists the related Subtasks, but allows confirmation.
- Overlapping drafts and submissions remain completely independent. The system never auto-merges, auto-prioritizes, or overwrites overlapping field values.

---

## 5. Task, Assignment, Draft, Submission, and Review Separation

### 5.1. Task and Task Assignment

- **Task**: Stores `id`, `workspace_id`, `assigner_id`, optional `parent_task_id` / `parent_assignment_id`, `template_version_id`, `deadline`, and overall task metadata. Subtasks additionally store `delegated_field_ids` (and optional read-only context field IDs).
- **Task Assignment**: Links one `assignee_id` to a `Task`, owning its own `DocumentDraft`, `Submission` list, `Review` decisions, and assignment lifecycle status. Subtask progress is aggregated across its assignments (e.g., `1/2 assignments approved`).

### 5.2. DocumentDraft

- Stores mutable field values (`field_values`) and an optimistic concurrency `version`.
- A Parent Draft allows the Parent Assignee to edit all authorized fields in $F$.
- A Subtask Draft allows its Assignee to edit only the delegated fields in $S$.
- **Autosave is not Submit**: Saving a draft never creates a submission or notifies the reviewer of a formal submission.

### 5.3. Immutable Submission Snapshot

- Each **Submit** action creates a new **immutable** `Submission` snapshot linked to `task_id`, `assignment_id`, `submitted_by`, `submitted_at`, `template_version_id`, `preset_version_id`, and the snapshot of assigned field values.
- **Draft Remains Unlocked**: Submitting a snapshot **never locks** the `DocumentDraft`. The Assignee may continue editing their Draft immediately after submitting (without waiting for a `Request Revision` decision) and may submit newer snapshots at any time. Subsequent edits to the Draft never mutate previously created `Submission` records.

### 5.4. Snapshot-Bound Review

- An Assigner reviews a **specific `submission_id`** (never the live `DocumentDraft`) and records a decision (`APPROVED` or `REVISION_REQUESTED`) with feedback comments.
- `REVISION_REQUESTED` is an evaluation of that specific snapshot, not an unlock operation on the Draft.
- Approving one recipient's assignment does not approve other assignments on the same Subtask, and **approving all Subtasks never automatically submits or approves the Parent Task**.

---

## 6. Manual Synthesis into Parent Draft (`Apply`)

- Approved Child Submissions serve as reference inputs for the Parent Assignee, who has full editorial authority over all fillable fields of the Parent Draft (select, copy, combine, rewrite, or ignore).
- **Structured `Apply` Action**:
  - Updates only the targeted field(s) in the Parent Draft, never performing blind full-document replacement.
  - Checks the Parent Draft's `version` (optimistic locking) and warns before overwriting non-empty existing field data.
  - Records **provenance metadata**: `source_submission_id`, `target_field_id`, `applied_by`, `applied_at`, and `parent_draft_version_after`.
  - When the Parent Assignee manually combines or rewrites content from multiple submissions, referenced `submission_id`s may be linked in activity history without requiring character-level provenance.
- Creating a new Child Submission after an `Apply` never automatically overwrites the Parent Draft.
- Once the Parent Draft is complete, the Parent Assignee explicitly submits a **Parent Submission** in the superior workspace for the Parent Assigner to review.

---

## 7. Task Communication and Visibility

- Every Task has a task-scoped discussion thread for clarifications, updates, review feedback, and activity history.
- Messages and comments are bound to `task_id` and `author_id`; review feedback is additionally bound to `submission_id`.
- Visibility follows workspace and assignment scope:
  - Superior workspace members with task access see the Parent Task and Parent Submissions.
  - The Parent Assignee sees the Parent Draft, all Subtasks they created in the internal workspace, and all internal Submissions.
  - Subtask Assignees see only their own Assignment, their own Draft/Submissions, delegated fields, and explicitly shared read-only context.

---

## 8. Lifecycle States, Revision Handling, and Domain Events

### 8.1. Assignment Lifecycle

Each `Task Assignment` transitions independently:
- `ASSIGNED → IN_PROGRESS → SUBMITTED → APPROVED`
- `SUBMITTED → REVISION_NEEDED → IN_PROGRESS → SUBMITTED`

### 8.2. Parent Revision After Child Approval (`DEC-007` / `D5`)

When a Parent Submission is returned with `REVISION_NEEDED` by the superior Assigner **after** one or more Child Subtask Submissions were already `APPROVED`:
- Previously approved Child `Submission` snapshots remain **immutable** and approved.
- The Parent Assignee may either edit the `Parent Draft` directly or create/assign new Subtask work in the internal workspace to gather updated inputs.

### 8.3. Cancellation, Reassignment, and Overdue Handling (`D4`)

- Detailed rules for cascading cancellation, assignee reassignment, member departure, and overdue policies are tracked as open item [`ISS-005`](../management/ISSUES.md).
- *Database baseline rule*: Never hard-delete (`ON DELETE CASCADE`) historical tasks, drafts, or submissions when a user leaves or is reassigned, preserving organizational continuity.

### 8.4. Minimum Auditable Domain Events

Every event records `actor_id`, `occurred_at`, and target entity IDs:
- `TaskAssigned`, `SubtaskCreated`, `AssignmentCreated`, `DraftSaved`, `SubmissionCreated`, `RevisionRequested`, `SubmissionApproved`, `SubmissionAppliedToParentField`, `ParentDraftEdited`, `TaskCancelled`.

---

## 9. Core Invariants (Must Hold in Code & Database)

- **I1 (Immutable Snapshots)**: Every `Submission` is immutable once created; every `Review` references a specific `submission_id`.
- **I2 (Independent Lifecycles)**: Child Subtask status and approval never automatically transition the Parent Task to `SUBMITTED` or `APPROVED`.
- **I3 (Explicit Synthesis & Provenance)**: Only the Parent Assignee mutates the Parent Draft; structured `Apply` operations record source provenance and never mutate the source `Submission`.
- **I4 (Workspace & Recipient Isolation)**: No unauthorized cross-workspace access and no cross-recipient draft/submission visibility on multi-assignee tasks.
- **I5 (Single Accountability)**: Accountability for submitting the Parent Task always remains with the Parent Assignee.
