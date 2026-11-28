# PA04 Template-to-Form and Form-to-Export

## Scope verified locally

Implemented the PA04 vertical slice for:

- UC-A02 / UC-A03 / UC-A05: create a Template from an uploaded DOCX or the bounded `to_trinh` preset path; review detected Fields; test-fill without creating a DocumentDraft; publish an immutable DocumentTemplate.
- UC-A06: create and reopen a personal DocumentDraft; typed inputs; 750 ms optimistic autosave; explicit save/retry/conflict state; minimal rich text for `long_text` (paragraph, bold, italic, bullet list, ordered list).
- UC-A09: authoritative DOCX/PDF render; PDF preview; marked draft export; deterministic final-export gate; immutable FileArtifact and RenderSnapshot persistence.

The live route is `/templates/new`. `/prototype` remains labelled mock/reference UI and is not PA04 implementation evidence.

## UC gap pass (2026-11-26)

A step-by-step comparison with UC-A02/A03/A05/A06/A09 closed these gaps, each backed by regression tests (`apps/api/tests/pa04/test_uc_gap_regressions.py`, web `reviewEditing.test.ts`, `state.test.ts`):

- Fixed: numbered lists from the real Tiptap editor were rejected (and the editor still offered link/underline); length rules on `long_text` measured JSON; `NaN` caused a server error; blank organization constants erased header text; rich-text line breaks stretched justified lines; bold/italic run properties could be out of OOXML schema order; the `BẢN NHÁP` mark sat at the end of the document.
- UC-A03: manual Field marking, extra Bindings, merge/delete and automatic-rule editing in the UI; the server now rejects out-of-range or overlapping accepted Bindings (DEC-020).
- UC-A05: test mode uses the filler inputs and runs the deterministic check (`POST /api/templates/{id}/test-check`) without persisting; publishing without a check asks for confirmation.
- UC-A05/A06: `/library` lists Templates and personal Drafts (`GET /api/templates`, `GET /api/drafts`); transient autosave failures retry with backoff; leaving with unsaved edits warns; failed previews can be retried.
- UC-A09: at most two concurrent LibreOffice processes (DEC-003); concurrent preview/final renders of one Draft version now share one PDF artifact.

A second scripted Chrome pass on the final code (2026-11-26) passed the main journey plus 18 edge checks: overlapping Binding rejection, published-Template immutability, final-export blocking, marked draft export, `dd/mm/yyyy` output, two-tab version conflict, preview collapse, one-line Quốc hiệu and mobile width. It exposed slow rendering with the local snap LibreOffice (about 15–20 s per conversion with a fresh profile; about 8 s with a reused one). Stale previews are now dropped before conversion and the web client keeps one preview request in flight; a preview can still take tens of seconds on this host.

## Optional render service (DEC-022)

```bash
docker compose up -d renderer
# then set RENDER_SERVICE_URL=http://127.0.0.1:3100 in .env and restart the API
```

Measured on one Linux host (2026-11-26), same generated `to_trinh` DOCX: service 0.27–0.68 s over three conversions; local snap LibreOffice 17.4 s (one run). With Times New Roman mounted from `fonts/`, both outputs embedded the same Times New Roman faces and had the same extracted text; first-page layout matched on visual inspection (PDF bytes were not compared across renderers). Without the mount the service substitutes Liberation Serif. With the service enabled and the local binary disabled, the main Chrome journey passed twice and all 18 edge checks passed.

That run exposed an older defect, now fixed with a regression test: opening a Draft with a rich-text Field autosaved without any edit and bumped its version, which made the just-rendered preview stale.

CI still exercises only the local LibreOffice path; the service client is tested against a local stub. The service has not been tried on a second machine or in a deployed environment.

## Verified commands and results

Final rerun on 2026-11-26 used isolated PostgreSQL 16 plus local LibreOffice:

```text
cd apps/api
alembic upgrade head
alembic check
python -m app.core.seed
ruff check .
mypy .
pytest -q
```

Result after the UC gap pass (fresh database, including downgrade to `20261125_0003` and re-upgrade): `123 passed, 1 warning`.

The warning is Starlette's upstream deprecation warning for its current `httpx` TestClient integration; it did not fail the suite.

```text
cd apps/web
npm run typecheck
npm run lint
npm test
npm run build
```

Result after the UC gap pass: `31 passed`; typecheck, lint, and production build passed.

## Live browser evidence

After the UC gap pass, a scripted Chrome run (Playwright, kept outside the repository, synthetic data) passed: preset create → review/rules → test mode → publish → Draft with numbered list → forced autosave failure and automatic retry → reload → preview/final PDF SHA equality → library → upload DOCX → manual Field and merge → publish warning. The only console errors were the intentionally aborted save and a stale-version preview `409`, which the UI discards. The earlier first-slice run is recorded below.

Using `http://localhost:5173` with a local API, isolated PostgreSQL 16, and synthetic data, the following path was exercised:

1. Open `/templates/new`.
2. Select the seeded ND30 FormattingPreset and bounded `to_trinh` type.
3. Create `E2E To trinh`; accept all four detected Fields; publish it.
4. Create a personal `E2E Draft`; enter four values; read the persisted Draft back at version 2 after autosave.
5. Render PDF preview, then use the visible final-PDF export control.
6. From a real browser fetch, verify `%PDF`, 22,162-byte preview/final bodies, byte equality, SHA-256 `c6ce2292de5e0f10005c07307e6204b910e78339b82f482a823153c11a836924`, and purpose-specific final delivery metadata `filename*=UTF-8''E2E%20To%20trinh-final.pdf`.

The rendered browser screen displayed the authoritative embedded PDF preview and the UI success message for final PDF export. `apps/web/public/favicon.svg` is linked from `index.html` to avoid the earlier missing-favicon request noise.

## CI gate

`.github/workflows/ci.yml` now installs LibreOffice Writer and runs `tests/pa04/test_pdf_rendering.py` before the full backend check. This verifies a real DOCX-to-PDF conversion in CI, not only a fake converter.

## Known limits

- The preset-generated route supports only `to_trinh`; other types are rejected intentionally.
- Local file storage is the current PA04 storage backend; R2 is not exercised.
- Rich text is deliberately constrained. HTML, links, media, tables, and arbitrary Word-editor behavior are rejected.
- Semantic/LLM checks remain advisory/unavailable warnings and never block final export. UC-A04 checklist authoring and the semantic half of UC-A07 are not implemented, so UC-A05 test mode shows deterministic results only (UC-A05 A2).
- Date Fields are written as `dd/mm/yyyy` (DEC-021); there is no per-preset or per-Field date format.
- Manual Binding selection works per source paragraph from a text picker, not by clicking on the rendered preview.
- UC-A09 A4 (export of a Submission snapshot) depends on Group B and is not implemented.
- The configured `RENDER_WORK_DIR` must be writable by the application and LibreOffice. The repository default is application-owned under `tmp/render`; a restricted runtime scratch directory can prevent LibreOffice from creating its user profile.
- The results here are local verification. The work is submitted by pull request (see it for remote CI status); it has not been reviewed or merged, and no tag or GitHub Release exists.
- No legal or regulatory compliance certification is claimed.

## Release gate still required

A GitHub release requires a reviewed and merged PR, green CI for the exact `origin/main` merge SHA, and an explicitly approved release tag/version. No release action is authorized by these notes alone.
