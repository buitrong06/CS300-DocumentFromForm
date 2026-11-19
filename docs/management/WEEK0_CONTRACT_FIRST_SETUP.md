# Week 0 — Thiết lập Contract-First và giao việc theo chiều dọc

| Trường | Giá trị |
| :--- | :--- |
| Đối tượng | Nhóm phát triển |
| Thời lượng | Khoảng 4 ngày |
| Trạng thái | Đã thống nhất hướng; chờ review baseline và scaffold |
| Ngày | 2026-11-16 |

---

## 1. Mục tiêu

Khóa quy ước dùng chung trong repository, khung ứng dụng chạy được, cổng CI, mô hình dữ liệu tối thiểu và một luồng end-to-end đã kiểm chứng trước khi triển khai song song theo feature.

**Auth trong Week 0:** chỉ dùng local-dev bypass. Firebase để giai đoạn sau.

**Khi thiếu thời gian (định hướng chung):** bám priority trong Vision (High → Medium → Low); ưu tiên UI và export cho các feature High. Phần Medium/Low có thể mỏng hơn. Các hard rule trong `AGENTS.md` vẫn bắt buộc (Submission bất biến; không auto-merge Apply; LLM không viết lại nội dung người dùng).

**Sau Week 0:** chia người; mỗi người phụ trách một luồng hoạt động (vertical slice) gắn feature Vision, merge qua pull request.

---

## 2. Tài liệu baseline cần xác nhận lại

| Tài liệu | Mục đích review |
| :--- | :--- |
| [`GLOSSARY.md`](../../GLOSSARY.md) | Thuật ngữ domain dùng thống nhất trong code, API, database và UI |
| [`docs/requirements/vision.md`](../requirements/vision.md) | Danh sách feature và thứ tự ưu tiên |
| [`docs/requirements/use-case-specification.md`](../requirements/use-case-specification.md) | Hành vi bên ngoài và ý định chấp nhận theo use case |
| [`docs/architecture/c4/`](../architecture/c4/) (C3 Backend, C3 Frontend) | Ranh giới module và phụ thuộc request |
| [`docs/analysis-and-design/database-overview.md`](../analysis-and-design/database-overview.md) (DEC-009, DEC-010) | Schema logic và quy ước PostgreSQL |
| [`docs/analysis-and-design/PRESET_DOMAIN.md`](../analysis-and-design/PRESET_DOMAIN.md), [`preset_example.yaml`](../analysis-and-design/preset_example.yaml) | Schema preset và phạm vi renderer MVP |
| [`docs/analysis-and-design/COMMUNICATION_DOMAIN.md`](../analysis-and-design/COMMUNICATION_DOMAIN.md) | Ngữ nghĩa Submission và Apply |
| [`docs/management/DECISIONS.md`](DECISIONS.md), [`ISSUES.md`](ISSUES.md) | Quyết định đã chốt và còn mở |
| [`AGENTS.md`](../../AGENTS.md) | Hard rule cho người và agent; lệnh verify (cập nhật sau khi scaffold) |

Mâu thuẫn phải ghi vào `ISSUES.md` / `DECISIONS.md`. Không tự invent thuật ngữ hoặc schema lệch baseline khi implement.

---

## 3. Công việc Week 0

**Điều kiện hoàn thành:** clone và chạy được local; PR qua CI xanh; một golden path chạy được bằng tay.

### 3.1 Cấu trúc repository

```text
.
├── apps/
│   ├── api/                 # FastAPI (Python)
│   └── web/                 # React, TypeScript, Vite
├── docs/
├── AGENTS.md
├── GLOSSARY.md
├── .env.example
├── docker-compose.yml       # PostgreSQL cho môi trường local
└── .github/workflows/ci.yml
```

Tạo skeleton router/service phía backend bám các component C3 Backend. Logic nghiệp vụ đầy đủ nằm ngoài phạm vi Week 0, trừ phần cần cho golden path.

Frontend tổ chức theo **feature folder**: shell dùng chung (`app/`, `shared/ui/`); từng feature Vision nằm dưới `features/<tên>/` để giảm xung đột khi chia việc theo chiều dọc. Thay đổi `shared/ui/` cần người được chỉ định review.

### 3.2 PostgreSQL local

Cung cấp database local qua Docker Compose (hoặc tương đương). Ghi connection settings trong `.env.example`. Không commit `.env`.

### 3.3 Mẫu môi trường và xác thực

- Công bố `.env.example` với các biến cần thiết (`DATABASE_URL`, cờ auth dev, …).
- Triển khai development auth bypass; tách phần lấy “current user” khỏi logic domain.
- Ghi quyết định ngắn trong `DECISIONS.md`: bypass khi dev; Firebase sau.

### 3.4 Continuous integration

| Kiểm tra | Vai trò |
| :--- | :--- |
| Lint | Format và style |
| Typecheck | Kiểm tra kiểu tĩnh |
| Test skeleton | Boot ứng dụng và xác minh endpoint tối thiểu |

Bộ test nghiệp vụ đầy đủ không thuộc deliverable Week 0; bổ sung theo từng slice sau này.

### 3.5 Hợp đồng API và router

Định nghĩa shape OpenAPI tối thiểu (hoặc do FastAPI sinh) cho golden path. Tổ chức router theo component C3. Thay đổi contract dùng chung cần PR riêng và thông báo nhóm.

### 3.6 Migration ban đầu

Chỉ tạo bảng cần cho golden path, ví dụ:

- `users`
- `workspaces` (và membership tối thiểu)
- `formatting_presets`
- `document_templates`, `template_fields`
- `document_drafts`

Các bảng còn lại (tasks, submissions, apply logs, …) thêm bằng migration trong các feature slice sau.

### 3.7 Seed data

Sau migration, nạp dữ liệu mẫu tối thiểu: user giả, một workspace, một built-in preset từ `preset_example.yaml`, một template có placeholder dạng `{{field}}`, tùy chọn một draft trống.

### 3.8 Golden path

Triển khai một luồng thật:

`đăng nhập dev (bypass) → mở template/form mẫu → điền một–hai field → lưu draft → export DOCX`

PDF, preview đầy đủ và kiểm tra LLM có thể để các slice sau.

### 3.9 AGENTS.md và mẫu PR

- Cập nhật `AGENTS.md` bằng lệnh verify chạy được cho `apps/api` và `apps/web`.
- Bổ sung PR template: bắt buộc Vision/UC ID, phạm vi slice và ghi chú test.

### 3.10 UI shell

Trong phạm vi: application shell, quy ước feature folder, control dùng chung, màn gắn golden path.

Ngoài phạm vi: hoàn thiện toàn bộ UI Vision bằng mock trước khi có contract API. Việc làm đẹp UI cho feature High thực hiện trong đúng vertical slice tương ứng.

---

## 4. Checklist Week 0

- [ ] Xác nhận lại tài liệu baseline (mục 2)
- [ ] Scaffold `apps/api` và `apps/web`; áp dụng feature folder
- [ ] PostgreSQL local và `.env.example`
- [ ] Auth bypass cho dev và ghi DEC
- [ ] CI: lint, typecheck, test skeleton
- [ ] Skeleton router và contract API cho golden path
- [ ] Migration tối thiểu và seed data
- [ ] Golden path kiểm chứng thủ công
- [ ] Cập nhật lệnh trong `AGENTS.md` và PR template
- [ ] UI shell và phân công review `shared/ui`

---

## 5. Tham chiếu

- [`docs/MISSING_CONTEXT.md`](../MISSING_CONTEXT.md) — chỉ mục ngữ cảnh và quy trình slice  
- [`AGENTS.md`](../../AGENTS.md) — hard rule  
- [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) — chỉ ghi tiến độ đã verify  
