# Issues & Conflicts Log

Track blocking ambiguities, spec disagreements, and technical debt discovered while exploring or implementing slices.

| ID | Date | Priority | Area | Description / Conflict | Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| ISS-001 | 2026-11-14 | P1 | Architecture / Deployment | C4 proposes cloud deployment (Cloudflare Pages, VPS/Docker, R2, Firebase Auth) while `vision.md` mentions local deployability. | Target Cloud per C4 (with local dev fallback); update `vision.md` to match. See [DEC-002](DECISIONS.md). | Resolved |
| ISS-002 | 2026-11-14 | P1 | Document Engine / NFR | LibreOffice Headless execution boundary and B3 (Deadline Reminders) scheduler scope for MVP. | Run LibreOffice as bounded in-process subprocess (timeout + concurrency cap); defer B3 scheduler from MVP. See [DEC-003](DECISIONS.md). | Resolved |
| ISS-003 | 2026-11-14 | P1 | Frontend / Editor Scope | Clarify `Tiptap` scope in C3 Frontend: rich-text form fields only vs full document editing. | Use Tiptap only for rich-text form fields inside `React Hook Form`; keep layout/DOCX/PDF rendering on backend. See [DEC-004](DECISIONS.md). | Resolved |
| ISS-004 | 2026-11-14 | P0 | Communication / Auth (`D1`) | `COMMUNICATION_DOMAIN.md` §3 (`D1`): Who creates workspaces, manages members, and how superior–internal workspace links are verified is not yet specified. | Pending decision before implementing workspace/subtask authorization. | Open |
| ISS-005 | 2026-11-14 | P1 | Communication / Lifecycle (`D4`) | `COMMUNICATION_DOMAIN.md` §8.3 (`D4`): Rules for task cancellation, assignee reassignment, overdue submission behavior, and member departure are not yet specified. | Pending decision before implementing task cancellation/reassignment flows. | Open |
