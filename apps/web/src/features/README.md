# Frontend feature boundaries

Each directory under `features/` owns one cohesive vertical slice. A feature may
contain its page, API adapter, model, components, and tests. Cross-feature imports
must use the target feature's public `index.ts`; do not reach into another
feature's internal component tree.

The `prototype/` subdirectories preserve the PA02 mock screens as design and UI
evidence. They are composed only by `src/prototype/PrototypeApp.tsx` and are not
evidence that the corresponding backend workflow is implemented.

Current slices:

- `template-authoring`: imported-DOCX field extraction plus the PA02 field setup reference.
- `document-filling`: guided field entry and document preview reference.
- `document-validation`: deterministic/semantic findings and correction reference.
- `task-delegation`: task and Subtask field-scope assignment reference.
- `submission-review`: immutable Submission review reference.
- `subtask-integration`: explicit Apply and provenance reference.

`app/` owns routing and application-level layout. `shared/` is reserved for
feature-independent API and UI primitives; changes to shared UI require the team
review described in `AGENTS.md`.
