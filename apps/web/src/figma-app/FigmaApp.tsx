import { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import {
  INITIAL_EXTRACTED_FIELDS,
  INITIAL_FILL_VALUES,
  type ExtractedFieldItem,
  type FillDocumentValues,
} from './state';
import { OverviewScreen } from './screens/OverviewScreen';
import { FormsLibraryScreen } from './screens/FormsLibraryScreen';
import { CreateFormScreen } from './screens/CreateFormScreen';
import { FieldExtractScreen } from './screens/FieldExtractScreen';
import { FieldConfigScreen } from './screens/FieldConfigScreen';
import { ChecklistScreen } from './screens/ChecklistScreen';
import { FinalizeFormScreen } from './screens/FinalizeFormScreen';
import { TaskTrackScreen } from './screens/TaskTrackScreen';
import { AssignTaskScreen } from './screens/AssignTaskScreen';
import { FormFillingScreen } from './screens/FormFillingScreen';
import { ContentCheckResultScreen } from './screens/ContentCheckResultScreen';
import { ExportDocumentScreen } from './screens/ExportDocumentScreen';
import { PresetsScreen } from './screens/PresetsScreen';
import { TeamScreen } from './screens/TeamScreen';
import { InboxScreen } from './screens/InboxScreen';
import { LoginScreen, ProfileScreen, WorkspaceScreen } from './screens/AccountScreens';
import './styles.css';

interface PageMeta {
  breadcrumb: string;
  title: string;
  sub?: string;
}

const META_BY_PATH: Record<string, PageMeta> = {
  '/app': { breadcrumb: 'Workspace / Tổng quan', title: 'Tổng quan người giao', sub: 'Theo dõi tiến độ người nhận, hạn nộp, bài nộp lỗi và phản hồi.' },
  '/app/overview': { breadcrumb: 'Workspace / Tổng quan', title: 'Tổng quan người giao', sub: 'Theo dõi tiến độ người nhận, hạn nộp, bài nộp lỗi và phản hồi.' },
  '/app/forms': { breadcrumb: 'Không gian làm việc / Biểu mẫu', title: 'Thư viện biểu mẫu', sub: 'Quản lý biểu mẫu nháp, đang duyệt và đã hoàn tất.' },
  '/app/forms/new': { breadcrumb: 'Biểu mẫu / Tạo mới', title: 'Tạo biểu mẫu' },
  '/app/forms/extract': { breadcrumb: 'Workspace / Form extraction', title: 'Trích xuất biểu mẫu', sub: 'Xác nhận các trường được phát hiện trước khi cấu hình biểu mẫu.' },
  '/app/forms/config': { breadcrumb: 'Không gian làm việc / Cấu hình trường', title: 'Cấu hình trường', sub: 'Chỉnh sửa nhãn, kiểu dữ liệu và quy tắc trước khi kiểm tra.' },
  '/app/forms/checklist': { breadcrumb: 'Biểu mẫu / Kiểm tra', title: 'Danh sách kiểm tra' },
  '/app/forms/finalize': { breadcrumb: 'Biểu mẫu / Hoàn tất', title: 'Hoàn tất biểu mẫu' },
  '/app/tasks': { breadcrumb: 'Công việc / Theo dõi', title: 'Theo dõi công việc' },
  '/app/tasks/assign': { breadcrumb: 'Công việc / Giao việc', title: 'Giao việc', sub: 'Gửi biểu mẫu kèm bộ tài liệu cho người nhận.' },
  '/app/tasks/fill': { breadcrumb: 'Công việc / Điền biểu mẫu', title: 'Điền biểu mẫu' },
  '/app/tasks/check': { breadcrumb: 'Không gian làm việc / Kết quả kiểm tra', title: 'Kết quả kiểm tra nội dung', sub: 'Xem lỗi xác định, cảnh báo ngữ nghĩa và bằng chứng cho từng kết quả.' },
  '/app/tasks/export': { breadcrumb: 'Không gian làm việc / Xuất tài liệu', title: 'Xuất tài liệu', sub: 'Chọn định dạng và tải tài liệu đã được kiểm tra.' },
  '/app/presets': { breadcrumb: 'Workspace / Preset', title: 'Thư viện preset', sub: 'Quy chuẩn định dạng để tạo mẫu và dựng file xuất.' },
  '/app/team': { breadcrumb: 'Workspace / Nhóm', title: 'Nhóm và workspace', sub: 'Giao việc, trao đổi và theo dõi tài liệu trong workspace.' },
  '/app/inbox': { breadcrumb: 'Workspace / Communication', title: 'Communication', sub: 'Collaborate on form changes with contextual review threads.' },
  '/app/workspace': { breadcrumb: 'Tài khoản / Workspace', title: 'Chọn workspace', sub: 'Chọn nơi bạn muốn làm việc.' },
  '/app/profile': { breadcrumb: 'Tài khoản / Hồ sơ', title: 'Hồ sơ cá nhân', sub: 'Quản lý thông tin tài khoản và workspace.' },
};

export function FigmaApp() {
  const { pathname } = useLocation();
  const [fields, setFields] = useState<ExtractedFieldItem[]>(INITIAL_EXTRACTED_FIELDS);
  const [fillValues, setFillValues] = useState<FillDocumentValues>(INITIAL_FILL_VALUES);
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);

  if (pathname === '/app/login') {
    return <LoginScreen />;
  }

  const notify = (title: string, detail: string) => {
    setToast({ title, detail });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleFieldStatus = (id: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: f.status === 'approved' ? 'review' : 'approved' } : f,
      ),
    );
  };

  const addField = () => {
    const idx = fields.length + 1;
    setFields((prev) => [
      ...prev,
      {
        id: 'custom_' + Date.now(),
        label: `Trường mới ${idx}`,
        type: 'short_text',
        typeLabel: 'Văn bản ngắn',
        confidence: '1,00',
        status: 'review',
        required: false,
        instruction: 'Nhập thông tin bổ sung.',
        sourceSpan: `Mục ${idx}: ........................................`,
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<ExtractedFieldItem>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const meta = META_BY_PATH[pathname] ?? META_BY_PATH['/app/overview'];

  return (
    <div className="fapp-shell" lang="vi">
      <Sidebar />

      <main className="fapp-main">
        <header className="fapp-page-header">
          <div>
            <div className="fapp-breadcrumb">{meta.breadcrumb}</div>
            <h1 className="fapp-heading">{meta.title}</h1>
            {meta.sub && <p className="fapp-subheading">{meta.sub}</p>}
          </div>

          <div className="fapp-header-right">
            <Link to="/app/profile" className="fapp-avatar" title="Le Gia Phuc · Hồ sơ cá nhân">LP</Link>
          </div>
        </header>

        <div className="fapp-page-body">
          <Routes>
            <Route index element={<OverviewScreen />} />
            <Route path="overview" element={<OverviewScreen />} />
            <Route path="forms" element={<FormsLibraryScreen />} />
            <Route path="forms/new" element={<CreateFormScreen />} />
            <Route
              path="forms/extract"
              element={
                <FieldExtractScreen
                  fields={fields}
                  onToggleFieldStatus={toggleFieldStatus}
                  onAddField={addField}
                />
              }
            />
            <Route
              path="forms/config"
              element={
                <FieldConfigScreen
                  fields={fields}
                  onUpdateField={updateField}
                  previewValues={fillValues}
                />
              }
            />
            <Route path="forms/checklist" element={<ChecklistScreen />} />
            <Route path="forms/finalize" element={<FinalizeFormScreen />} />
            <Route path="tasks" element={<TaskTrackScreen />} />
            <Route path="tasks/assign" element={<AssignTaskScreen />} />
            <Route
              path="tasks/fill"
              element={
                <FormFillingScreen
                  values={fillValues}
                  onChange={(patch) => setFillValues((prev) => ({ ...prev, ...patch }))}
                  onNotify={notify}
                />
              }
            />
            <Route path="tasks/check" element={<ContentCheckResultScreen values={fillValues} />} />
            <Route
              path="tasks/export"
              element={<ExportDocumentScreen values={fillValues} onNotify={notify} />}
            />
            <Route path="presets" element={<PresetsScreen />} />
            <Route path="team" element={<TeamScreen onNotify={notify} />} />
            <Route path="inbox" element={<InboxScreen />} />
            <Route path="workspace" element={<WorkspaceScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
            <Route path="*" element={<Navigate to="/app/overview" replace />} />
          </Routes>
        </div>
      </main>

      {toast && (
        <div className="fapp-toast" role="status">
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{toast.title}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{toast.detail}</div>
        </div>
      )}
    </div>
  );
}

export default FigmaApp;
