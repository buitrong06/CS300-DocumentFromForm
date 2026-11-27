import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import PrototypeApp from '../PrototypeApp';
import { Header } from '../components/Header';
import { DocumentPreview, GuidedFormScreen } from '../../features/document-filling';
import { ExportDocumentScreen } from '../../features/document-filling/prototype/ExportDocumentScreen';
import { documentExportIssues, missingRequiredFields } from '../../features/document-filling/prototype/documentWorkflow';
import { FieldConfigurationScreen } from '../../features/template-authoring';
import { TemplateAuthoringFlow } from '../../features/template-authoring/prototype/TemplateAuthoringFlow';
import { ContentCheckScreen } from '../../features/document-validation';
import { AssignWorkScreen } from '../../features/task-delegation';
import { ReviewSubmissionScreen } from '../../features/submission-review';
import { IntegrateResultsScreen } from '../../features/subtask-integration';
import {
  INITIAL_FORM_VALUES,
  INITIAL_TEMPLATE_FIELDS,
  INITIAL_RULE_FINDINGS,
  INITIAL_CORRECTION_SUGGESTIONS,
  INITIAL_SUBMISSIONS,
  INITIAL_DELEGATED_RESULTS,
  INITIAL_PROVENANCE_LOGS,
} from '../scenario';

describe('Document: Fill & Deliver - Frontend Prototype PA02', () => {
  it('starts PA02 with distinct entries for filling an assignment and creating a template', () => {
    const html = renderToString(<PrototypeApp />);
    expect(html).toContain('Fill &amp; Deliver');
    expect(html).toContain('Kịch bản PA02');
    expect(html).toContain('Mở biểu mẫu được giao');
    expect(html).toContain('Tạo mẫu biểu');
    expect(html).toContain('Tờ trình xin kinh phí Ngày hội Tân sinh viên');
    expect(html).toContain('<time dateTime="2026-11-05">05/11/2026</time>');
  });

  it('renders Header with navigation tabs and prototype screen pills', () => {
    const html = renderToString(
      <Header
        currentScreen="screen2"
        onSelectScreen={() => {}}
        activeNavTab="tasks"
        onSelectNavTab={() => {}}
      />
    );
    expect(html).toContain('Công việc');
    expect(html).toContain('Tài liệu của tôi');
    expect(html).toContain('Thư viện mẫu');
    expect(html).toContain('Preset');
    expect(html).toContain('Màn hình 1 · Cấu hình trường');
    expect(html).toContain('Màn hình 6 · Tổng hợp kết quả');
  });

  it('renders Screen 1 (UC-A03: Form Field Configuration) correctly', () => {
    const html = renderToString(<FieldConfigurationScreen fields={INITIAL_TEMPLATE_FIELDS} setFields={() => {}} selectedId="f9" onSelectField={() => {}} dateResolved={false} onResolveDate={() => {}} />);
    expect(html).toContain('Đơn xin nghỉ học');
    expect(html).toContain('Cấu hình các trường');
    expect(html).toContain('Kết quả nhận diện');
    expect(html).toContain('Từ dòng chấm &quot;......&quot;');
    expect(html).toContain('Họ và tên');
    expect(html).toContain('Lý do');
    expect(html).toContain('3 chỗ trống liền nhau trông giống một ngày tháng');
  });

  it('offers both template sources and explains the route to real DOCX extraction', () => {
    const html = renderToString(<TemplateAuthoringFlow onHome={() => {}} />);
    expect(html).toContain('Dùng tài liệu Word minh họa');
    expect(html).toContain('Dùng mẫu định dạng minh họa');
    expect(html).toContain('href="/templates/import"');
    expect(html).toContain('Điền thử và lưu');
  });

  it('renders Screen 2 (UC-A06: Guided Form Filling with Live Preview) correctly', () => {
    const html = renderToString(
      <GuidedFormScreen
        values={INITIAL_FORM_VALUES}
        onChangeValues={() => {}}
        onNavigate={() => {}}
      />
    );
    expect(html).toContain('Chi đoàn 23CTT1');
    expect(html).toContain('Ngày hội Tân sinh viên 2026');
    expect(html).toContain('Nghị định 30/2020');
    expect(html).toContain('Kiểm tra nội dung');
    expect(html).toContain('Đến ô còn thiếu');
    expect(html).toContain('max="9"');
    expect(html).toContain('₫');
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain('Nộp bài');
  });

  it('associates the correction message with the field opened from content check', () => {
    const html = renderToString(
      <GuidedFormScreen values={INITIAL_FORM_VALUES} onChangeValues={() => {}} onNavigate={() => {}} focusField="totalBudget" />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="draft-totalBudget-error draft-totalBudget-help"');
    expect(html).toContain('id="draft-totalBudget-error"');
    expect(html).not.toContain('id="draft-programSchedule-error"');
  });

  it('renders DocumentPreview with Vietnamese Decree 30/2020 official styling', () => {
    const html = renderToString(<DocumentPreview values={INITIAL_FORM_VALUES} />);
    expect(html).toContain('ĐOÀN KHOA CÔNG NGHỆ THÔNG TIN');
    expect(html).toContain('ĐOÀN TNCS HỒ CHÍ MINH');
    expect(html).toContain('TỜ TRÌNH');
    expect(html).toContain('Ban Thường vụ Đoàn khoa Công nghệ Thông tin');
    expect(html).toContain('Trần Minh Khoa');
    expect(html).toContain('aria-label="Thu nhỏ bản xem trước"');
    expect(html).toContain('aria-label="Phóng to bản xem trước"');
    expect(html).toContain('aria-label="Chú giải"');
  });

  it('renders Screen 3 (UC-A07 & UC-A08: Content Check & Suggestions) correctly', () => {
    const html = renderToString(
      <ContentCheckScreen
        values={INITIAL_FORM_VALUES}
        onChangeValues={() => {}}
        onNavigate={() => {}}
        onEditField={() => {}}
      />
    );
    expect(html).toContain('Kiểm tra nội dung');
    expect(html).toContain('Cần sửa trước khi xuất bản hoàn chỉnh');
    expect(html).toContain('Sửa nội dung chương trình');
    expect(html).toContain('Sửa tổng kinh phí');
    expect(html).toContain('Gợi ý sửa lỗi nhỏ');
    expect(html).toContain('Tiếp tục xuất tài liệu');
    expect(html).not.toContain('Phải sau ngày lập (29/10/2026)');
  });

  it('offers draft export when required fields are missing and DOCX/PDF format selection remains available', () => {
    const html = renderToString(<ExportDocumentScreen values={INITIAL_FORM_VALUES} onBack={() => {}} onEditField={() => {}} />);
    expect(html).toMatch(/<input[^>]+disabled=""[^>]*\/> Bản hoàn chỉnh/);
    expect(html).toMatch(/<input[^>]+checked=""[^>]*\/> Bản nháp/);
    expect(html).toContain('Mô phỏng xuất PDF');
    expect(html).toContain('DOCX');
  });

  it('recomputes export eligibility from current required values and the date rule', () => {
    const completed = { ...INITIAL_FORM_VALUES, programSchedule: '08:00 Khai mạc', totalBudget: 500000 };
    expect(missingRequiredFields(INITIAL_FORM_VALUES).map(({ key }) => key)).toEqual(['programSchedule', 'totalBudget']);
    expect(documentExportIssues(completed)).toEqual([]);
    expect(documentExportIssues({ ...completed, eventDate: completed.createDate }).map(({ key }) => key)).toEqual(['eventDate']);
    expect(documentExportIssues({ ...completed, purpose: ' ', totalBudget: -5 }).map(({ key }) => key)).toEqual(['purpose', 'totalBudget']);
  });

  it('renders Screen 4 (UC-B03: Assign Work from a Form) correctly', () => {
    const html = renderToString(<AssignWorkScreen onNavigate={() => {}} />);
    expect(html).toContain('Giao việc từ công việc này');
    expect(html).toContain('Nội dung chương trình');
    expect(html).toContain('Dự trù kinh phí chi tiết');
    expect(html).toContain('Tổng kinh phí');
    expect(html).toContain('Phạm Thị Vy');
    expect(html).toContain('Ngô Quang');
    expect(html).toContain('Muộn hơn hạn của công việc gốc');
  });

  it('renders Screen 5 (UC-B05: Review a Submission) correctly', () => {
    const html = renderToString(<ReviewSubmissionScreen onNavigate={() => {}} />);
    expect(html).toContain('Duyệt bài nộp · Nội dung chương trình');
    expect(html).toContain('Lê Văn Uy');
    expect(html).toContain('SUB-2026-0412');
    expect(html).toContain('So sánh với lần #1');
    expect(html).toContain('Kiểm tra tự động lúc nộp');
    expect(html).toContain('Yêu cầu sửa');
    expect(html).toContain('✓ Duyệt');
  });

  it('renders Screen 6 (UC-B06: Integrate Delegated Results) correctly', () => {
    const html = renderToString(
      <IntegrateResultsScreen
        values={INITIAL_FORM_VALUES}
        onChangeValues={() => {}}
        onNavigate={() => {}}
      />
    );
    expect(html).toContain('Tổng hợp kết quả vào bản nháp của bạn');
    expect(html).toContain('Hai kết quả đã duyệt khác nhau cho cùng một trường');
    expect(html).toContain('Lê Văn Uy');
    expect(html).toContain('Phạm Thị Vy');
    expect(html).toContain('Áp dụng vào trường');
    expect(html).toContain('Lịch sử tổng hợp');
    expect(html).toContain('Kiểm tra &amp; nộp lên BCH Đoàn khoa');
  });

  it('verifies initial domain data integrity', () => {
    expect(INITIAL_TEMPLATE_FIELDS.length).toBe(9);
    expect(INITIAL_RULE_FINDINGS.length).toBe(4);
    expect(INITIAL_CORRECTION_SUGGESTIONS.length).toBe(3);
    expect(INITIAL_SUBMISSIONS.length).toBe(2);
    expect(INITIAL_DELEGATED_RESULTS.length).toBe(3);
    expect(INITIAL_PROVENANCE_LOGS.length).toBe(5);
  });
});
