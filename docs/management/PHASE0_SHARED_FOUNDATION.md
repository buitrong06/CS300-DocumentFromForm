# Nhịp 0 — Shared Foundation Contract

**Branch:** `chore/phase0-shared-foundation`
**Scope:** nền dùng chung trước khi năm vertical slice phát triển song song.

## 1. Ownership boundary

| Vùng | Owner / quy tắc merge |
| :--- | :--- |
| `apps/api/app/core/`, `apps/api/alembic/`, `apps/api/app/main.py` | Platform owner; feature PR không tự sửa migration revision đã merge. |
| `apps/api/app/contracts/` | Shared contract; thay đổi cần Platform owner và ít nhất một consumer owner review. |
| `apps/web/src/app/`, `apps/web/src/shared/` | App-shell owner; feature code đặt trong `src/features/<slice>/`. |
| `apps/api/app/modules/<slice>/` | Owner của vertical slice tương ứng. |
| `apps/web/src/features/<slice>/` | Cùng owner với backend slice; không tách frontend/backend thành hai ownership độc lập. |

Mỗi migration feature là một Alembic revision mới. Không sửa migration đã được merge hoặc tạo nhiều revision song song mà chưa thống nhất revision head.

## 2. Database foundation

Migration đầu tiên chỉ sở hữu các dependency xuyên module:

- `users`
- `workspaces`
- `workspace_members`
- `file_artifacts`

Các bảng `formatting_presets`, `document_templates`, `document_drafts`, `tasks`, `submissions` và bảng phụ thuộc thuộc migration của vertical slice tương ứng. Tất cả model dùng chung `app.core.models.Base` để Alembic có một metadata duy nhất. Mỗi module model mới phải được import trong `app.core.model_registry` để Alembic autogenerate nhìn thấy bảng của module.

Chạy migration từ `apps/api`:

```bash
alembic upgrade head
```

Kiểm tra SQL mà không cần kết nối PostgreSQL:

```bash
alembic upgrade head --sql
```

## 3. Frozen v1 handoff contracts

Source of truth phía backend nằm trong `apps/api/app/contracts/`. TypeScript mirror nằm trong `apps/web/src/shared/api/contracts.ts`; khi backend contract đổi, hai phía phải được cập nhật trong cùng PR cho đến khi nhóm bổ sung OpenAPI code generation.

| Contract | Producer | Consumer | Invariant chính |
| :--- | :--- | :--- | :--- |
| `PublishedTemplate` | Preset & Template | Draft, Rendering, Task | Một template version cụ thể; field type dùng `amount_of_money`. |
| `DraftState`, `DraftSaveRequest` | Document & Draft | Verification, Rendering, Submission | `expected_version` là optimistic-lock token; conflict trả HTTP 409. |
| `ValidationResult`, `GateDecision` | Verification | Draft UI, Rendering, Submission | Required/automatic rules có thể block; semantic findings chỉ cảnh báo. `checked_field_keys` ghi rõ validation scope. |
| `RenderRequest`, `RenderSnapshot` | Rendering | Draft/Review UI | Draft render bắt buộc chỉ rõ `source_draft_version`; output là append-only snapshot. |
| `SubmissionCreateRequest`, `SubmissionSnapshot`, `ApplyRequest` | Submission & Review | Task/Review UI | Client không gửi snapshot values; server đọc Draft. Apply luôn có expected parent version và source provenance. |

Contract v1 chỉ khóa shape giao tiếp, không triển khai business service hay endpoint thay cho owner của slice.

## 4. Frontend boundary

- `src/app/App.tsx` chỉ chứa route composition và shell.
- Template extraction hiện tại đã chuyển vào `src/features/template-builder/`.
- HTTP transport chung nằm tại `src/shared/api/http.ts`.
- Prototype PA02 tiếp tục là UX reference tại `src/prototype/`; không được xem là production feature implementation.

Route nền:

- `/templates/import` — workflow trích xuất field hiện có.
- `/prototype` — sáu màn hình mock PA02.

Feature mới tự khai báo page/component trong feature folder và gửi một thay đổi route nhỏ để app-shell owner review.

## 5. Merge gate

Mọi feature PR phải chạy:

```bash
# apps/api
ruff check . && mypy . && pytest

# apps/web
npm run typecheck && npm run lint && npm test && npm run build
```

Chỉ cập nhật `IMPLEMENTATION_STATUS.md` khi code path thật và test evidence đều tồn tại; prototype hoặc contract-only không được đánh dấu là feature hoàn thành.
