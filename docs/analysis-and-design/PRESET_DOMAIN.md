# Preset & Template Domain Specification

**Status:** Authoritative implementation baseline for coding and database design  
**Reference example:** [`preset_example.yaml`](preset_example.yaml) (Decree 30/2020/ND-CP administrative document preset)  
**Derived from:** [`docs/requirements/vision.md`](../requirements/vision.md) (A1–A13), [`docs/requirements/use-case-specification.md`](../requirements/use-case-specification.md) (UC-A01–UC-A09, UC-C01–UC-C03), and the Preset Design proposal.

---

## 1. Core Principles & Separation of Concerns

1. **Mechanism in Code, Values in Data**: Application code implements the *mechanisms* (meaning of schema keywords), while specific formatting rules, layout parameters, and document skeletons live in structured YAML/JSONB data.
2. **Role-Keyed Architecture**: Formatting and layout blocks (`core.styles`, `advanced.styles`, `advanced.decorations`, `advanced.text_rules`, `advanced.layout`) are keyed by **semantic role names** (e.g., `quoc_hieu`, `tieu_ngu`, `trich_yeu`, `can_cu`, `body`, `chuc_vu`). The renderer merges all attributes for a given role across blocks.
3. **Units Convention**:
   - Lengths / margins / indents: millimeters (`mm`).
   - Font sizes & paragraph spacing: points (`pt`).
   - Rule/line lengths: ratio (`0.0–1.0`) relative to the text line above, or `full_width`.

---

## 2. Preset Schema Structure (6 Top-Level Blocks)

A **FormattingPreset** is represented in YAML (for import/export and built-in files) and stored in PostgreSQL as versioned rows with structured `JSONB` columns:

| Block | Purpose | Renderer / Engine Usage |
| :--- | :--- | :--- |
| `meta` | Preset identifier (`id`), human-readable `name`, `version`, base preset (`extends`), source `regulation` metadata, and `authored_by`. | Indexed as relational columns (`slug`, `version`, `extends_version_id`) + metadata. |
| `core` | Universal formatting rules every preset defines: `page` (size, orientation, margins), `font` (family, color), and `styles` per role (font size, case, bold/italic, alignment, indent, spacing, `fixed_text`, `optional`). | **Mandatory for MVP Renderer.** Any compliant renderer must support 100% of `core`. |
| `advanced` | Rule-encodable formatting extensions organized into modular sub-blocks: `styles`, `constraints`, `decorations`, `text_rules`, `patterns`, `numbering`, `content_structures`, `layout`, `page_rules`, `conditions`, `signing_overlays`, and `planned`. | Modular execution (see Section 3 for MVP vs. post-MVP subset). |
| `document_types` | *(Optional)* Skeleton definitions per document type (`quyet_dinh`, `cong_van`, `van_ban_co_ten_loai`, `phu_luc`), specifying ordered `sections` (`header`, `footer`, `{fixed: ...}`, `{slot: ...}`, `{auto: ...}`). | Used by the Template Generator (`UC-A02`) and Field Detector (`UC-A03`) when creating templates from a preset. |
| `unruled` | Rules that cannot be checked deterministically by formatting code: `semantic_criteria` (checked by LLM with evidence quotes, tagged with `applies_to` and `check_at: template \| draft`) and `manual_checks` (user self-check items). | Seeds the Verification Checklist (`UC-A04`) and drives Content Check (`UC-A05`, `UC-A07`). |
| `evidence` | Provenance map keyed by YAML path (e.g., `core.styles.quoc_hieu`), storing `kind` (`regulation` \| `interpretation` \| `convention` \| `docx` \| `manual` \| `not_specified`), `ref` (`section`, `page`), verbatim `quote`, `locator`, `confidence`, `extracted_by`, and `review` status (`unreviewed` \| `accepted` \| `edited`). | **Ignored by the Renderer.** Stored in a separate `JSONB` column and loaded only for Preset Review (`UC-A01`) and audit explanations. |

---

## 3. MVP Renderer Execution Boundary

While the Preset YAML schema captures the full richness of administrative regulations (such as Decree 30/2020/ND-CP), the **MVP Document Processing Engine** (`python-docx` + `docxtpl` + `LibreOffice Headless`) enforces a clear boundary. LibreOffice runs as a local subprocess by default (`DEC-003`) or inside the optional Gotenberg `renderer` container when `RENDER_SERVICE_URL` is set (`DEC-022`):

### 3.1. Mandatory in MVP
- **`core`**: Page size/orientation/margins, default font, and all role-based paragraph/character `styles`.
- **`advanced.layout`**: Borderless multi-column tables for administrative headers (`header`) and signature/recipient footers (`footer`), plus top-level block ordering.
- **`advanced.decorations`**: Horizontal rules (`rule_below` / `rule_above`) under `tieu_ngu`, `co_quan_ban_hanh`, `trich_yeu`, etc.
- **`advanced.patterns` & `advanced.text_rules`**: Deterministic string formatting and punctuation checks for `so_ky_hieu`, `dia_danh_ngay`, `kinh_gui`, `noi_nhan_item`, and `can_cu`.
- **`document_types`**: Generating formatted DOCX skeletons with fixed text and fillable `{slot: ...}` placeholders.

### 3.2. Supported in Schema, Deferred in Renderer (Post-MVP)
- **`advanced.signing_overlays`**: Automatic compositing of transparent PNG signature and red seal overlays at exact overlap ratios.
- **`advanced.page_rules` (complex)**: Per-section landscape switching (`landscape_allowed_for: table_sections`) and per-appendix page number resets.
- **`advanced.content_structures` (deep recursive trees)**: Full AST enforcement of nested `phan -> chuong -> muc -> tieu_muc -> dieu -> khoan -> diem` inside free-form body text (MVP treats long body fields as rich-text paragraphs/lists via Tiptap).

---

## 4. Preset Creation & Review Workflow (`UC-A01`)

1. **Normalize Source**: Convert source regulation (PDF/DOCX) into structured sections with stable section IDs (e.g., `PL I, II.1.a`), preserving tables and flagging non-text figures.
2. **Filter Relevant Sections**: Select clauses governing document formatting and structure.
3. **Select Base Preset**: Optionally extend an existing preset (`meta.extends`); only overrides and additions are extracted.
4. **Tiered Extraction**: Extract `core`, then `advanced` sub-blocks, then `document_types` against strict JSON Schemas. Values not found in the text must return `not_specified` (never guessed from prior model knowledge).
5. **Classify Remaining Clauses**: Uncited clauses are categorized into `unruled.semantic_criteria` (with `applies_to` and `check_at: template | draft`), `unruled.manual_checks`, `advanced.planned`, or out-of-scope.
6. **Deterministic Validation**: Code validates schema compliance, fuzzy-matches every `quote` against the cited source section, checks value ranges, and flags conflicts.
7. **Human Review & Test Render**: The creator reviews values alongside highlighted source quotes (`UC-A01`), edits or supplies missing `layout`/`document_types`, runs a sample render, and saves the preset as an **immutable new version** (existing templates, drafts, and submissions remain bound to their original preset version).

---

## 5. Preset vs. DocumentTemplate & Dual Template Creation Modes

| Aspect | FormattingPreset | DocumentTemplate |
| :--- | :--- | :--- |
| **Definition** | Reusable formatting rules, layout, optional document-type skeletons, and regulatory criteria. | A concrete, versioned document blueprint owned by an organization or user, ready for form filling. |
| **Contents** | `core`, `advanced`, `document_types`, `unruled`, `evidence`. | Filled organization constants (agency name, signer title), locked fixed text, typed `Field`s, `Binding`s, approved `VerificationChecklist`, and reference to `preset_version_id` / `source_artifact_id`. |
| **Created via** | Built-in (`nd30-2020`) or `UC-A01` (from regulation / sample DOCX). | `UC-A02` → `UC-A03` → `UC-A04` → `UC-A05`. |

### Dual Template Creation Modes (`UC-A02`, `UC-A03`, `UC-A09`)

The system supports two distinct pathways for creating a `DocumentTemplate` (and `Personal Document` in `UC-C01`):

1. **Mode A — Preset-Generated Template (`source_type = 'preset'`)**:
   - The creator selects a `FormattingPreset` and a `document_type` (e.g., `quyet_dinh`, `to_trinh`).
   - The engine generates a formatted skeleton from `document_types.<type>.sections` + `core` + `advanced.layout`.
   - Organization constants (`co_quan_ban_hanh`, `co_quan_chu_quan`, etc.) are filled once and checked against `semantic_criteria` where `check_at == 'template'`.
   - Each `{slot: ...}` in `sections` becomes a candidate `Field` with a known role binding.

2. **Mode B — Uploaded-DOCX Template (`source_type = 'uploaded_docx'`)**:
   - The creator (or personal user in `UC-C01`) uploads an existing `.docx` file (`source_artifact_id`).
   - The system preserves the uploaded file's original formatting (`Vision A11`, `UC-A02 A1`) and automatically detects candidate `Field`s from three human conventions (`UC-A03`):
     1. **Explicit markers**: e.g., `{{field_name}}`.
     2. **Word comments**: text spans with attached DOCX comments (comment text becomes field instruction).
     3. **Blank patterns**: dotted lines (`......`), underscores (`____`), or empty table cells adjacent to a label (preceding text becomes field label; field type is inferred from label keywords such as `"Ngày"` → `date`, `"Kinh phí"` → `amount_of_money`).
   - One `Field` may map to **one or multiple positions (`Binding`s)** in the document (e.g., applicant name appearing in both the header body and signature block).
   - All non-field text is locked (except in unreviewed one-off imports `UC-C01` where locking is not guaranteed).
   - An uploaded DOCX template may optionally reference a `FormattingPreset` to inherit its `unruled.semantic_criteria` for `UC-A04` / `UC-A07`.
