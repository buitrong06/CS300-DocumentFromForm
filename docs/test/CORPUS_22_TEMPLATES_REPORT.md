# Uploaded-DOCX test on the 22-template corpus (2026-11-26)

Corpus: `PA02 — Kho văn bản mẫu (22 tài liệu)` from the course materials (not committed; originals verified unchanged by SHA-256). Code: the then-uncommitted working tree on `feat/pa04-template-form-export`. Renderer: Gotenberg 8.40.0 (DEC-022) with Times New Roman mounted.

## Method

Each file went through the real API: upload → accept **every** proposed Field → publish → Draft with a unique marker per Field → DOCX and PDF export. When two proposals overlapped, one was rejected. Choice Fields without options would have received placeholders (none occurred). Page 1 of source and filled PDF was compared visually; later pages were not inspected. Manual Field marking and Microsoft Word were not tested. "Accept every proposal" measures detection quality; a creator reviewing carefully would reject some proposals and add others by hand.

## Pipeline results

- 21/22 completed every step. `VB-03` is a legacy `.doc` and was rejected (`422 Upload a .docx file`).
- No visible character outside a Binding changed (differences were tabs/line breaks only); package parts other than document/header/footer XML were byte-identical.
- Every text marker was found in its PDF; page counts matched the source; PDF export averaged 0.49 s (max 1.14 s).
- These checks compare against the detector's own Bindings, so they **cannot** show that a Binding was placed correctly. See the next sections.
- Fonts other than Times New Roman (Calibri, Arial, Times) were substituted by the renderer in some files (BM-01, BM-03, BM-04, BM-06, VB-05).

## Detection verdict (judgement from page 1 and Binding data)

| Verdict | Files | Reason |
| :--- | :--- | :--- |
| Usable after small corrections (4) | BM-01, BM-02, VB-01, VB-02 | BM-01: 10 blanks are proposed twice; keeping the dotted-line proposal gives a clean page, keeping the other breaks the layout. BM-02, BM-01: "sinh viên" Fields typed as date. VB-01/02: date line and spacing defects; some free-text blanks missed. |
| Partial (4) | BM-03, BM-05, VB-05, VB-06 | Missed blank lines and unmarked items; split date line renders as "ngày … tháng 26/11/2026năm 26/11/2026"; stray empty-cell Fields. |
| Auto-detection not usable (12) | NĐ30-01…10, BM-04, BM-06 | NĐ30 files use `[…]` placeholders: **0 of 170** are covered. Only the `...` inside some brackets is detected, so output keeps the bracket text (`[Chi tiết nội dungQX002]`). Each also gets two zero-width Fields in the signature table. BM-04 and BM-06 yield one stray Field each. |
| Removes fixed text (1) | VB-04 | One date proposal covers a whole sentence; filling it deletes "Căn cứ quyết định số … của … về việc …". |
| Unsupported (1) | VB-03 | `.doc` |

## Defects (see ISSUES.md)

1. ISS-008 — `_date_spans` joins every blank within about 100 characters once "tháng … năm" appears, including the fixed words between them.
2. ISS-009 — `[…]` placeholders are not detected.
3. ISS-010 — the dotted-line pattern includes trailing whitespace; 21 Bindings consume the space before the next word.
4. ISS-011 — duplicate proposals for one blank, stray zero-width empty-cell proposals, and "sinh viên" inferred as a date (substring "sinh").

## Rerun after fixing ISS-008 to ISS-011 (2026-11-26)

The sections above describe the run **before** the fixes. Same method on the fixed analyzer:

| Check | Before | After |
| :--- | :--- | :--- |
| Files completing every step | 21 | 19 (BM-04 and BM-06 now get no proposal; their only earlier proposal was a stray empty-cell Field, so they need manual marking) |
| ND30 `[…]` placeholders replaced whole | 0 / 170 | 170 / 170 |
| Bindings removing source words | 1 (VB-04) | 0 |
| Bindings consuming the following space | 21 | 0 |
| Overlapping proposals | 10 (BM-01) | 0 |
| "sinh viên" typed as date | 2 files | 0 |

No visible character outside a Binding changed, originals are unchanged by SHA-256, and page 1 of BM-01, BM-03, VB-01, VB-02, VB-04 and ND30-01/02/07/08 was inspected on the post-fix output (before a final label-only change). The proposals for the 21 corpus DOCX files and 4 repository samples were compared before and after; this caught, and led to fixing, real ellipsis blanks being dropped as reference dots.

Still not detected: free-text dotted lines without a label (BM-01, BM-05, VB-04, VB-06), blanks made only of spaces (for example "ngày    tháng    năm" and "Số:    /" in ND30 headers), and unlabelled place blanks before ", ngày". Accepting up to 25 ND30 proposals still takes one review action each. Templates uploaded before the fix keep their stored proposals and must be uploaded again.
