import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import PrototypeApp from '../PrototypeApp';
import { Header } from '../components/Header';
import { DocumentPreview } from '../components/DocumentPreview';
import { Screen1FieldConfig } from '../components/Screen1FieldConfig';
import { Screen2GuidedForm } from '../components/Screen2GuidedForm';
import { Screen3ContentCheck } from '../components/Screen3ContentCheck';
import { Screen4AssignWork } from '../components/Screen4AssignWork';
import { Screen5ReviewSubmission } from '../components/Screen5ReviewSubmission';
import { Screen6IntegrateResults } from '../components/Screen6IntegrateResults';
import {
  INITIAL_FORM_VALUES,
  INITIAL_TEMPLATE_FIELDS,
  INITIAL_RULE_FINDINGS,
  INITIAL_CORRECTION_SUGGESTIONS,
  INITIAL_SUBMISSIONS,
  INITIAL_DELEGATED_RESULTS,
  INITIAL_PROVENANCE_LOGS,
} from '../mockData';

describe('Document: Fill & Deliver - Frontend Prototype PA02', () => {
  it('renders the main App container without errors', () => {
    const html = renderToString(<PrototypeApp />);
    expect(html).toContain('Fill &amp; Deliver');
    expect(html).toContain('Màn hình PA02');
    expect(html).toContain('Tờ trình xin kinh phí Ngày hội Tân sinh viên');
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
    const html = renderToString(<Screen1FieldConfig onNavigate={() => {}} />);
    expect(html).toContain('Đơn xin nghỉ học');
    expect(html).toContain('Cấu hình trường');
    expect(html).toContain('Kết quả nhận diện');
    expect(html).toContain('Từ dòng chấm &quot;......&quot;');
    expect(html).toContain('Họ và tên');
    expect(html).toContain('Lý do');
    expect(html).toContain('3 chỗ trống liền nhau trông giống một ngày tháng');
  });

  it('renders Screen 2 (UC-A06: Guided Form Filling with Live Preview) correctly', () => {
    const html = renderToString(
      <Screen2GuidedForm
        values={INITIAL_FORM_VALUES}
        onChangeValues={() => {}}
        onNavigate={() => {}}
      />
    );
    expect(html).toContain('Chi đoàn 23CTT1');
    expect(html).toContain('Ngày hội Tân sinh viên 2026');
    expect(html).toContain('Nghị định 30/2020');
    expect(html).toContain('Kiểm tra nội dung');
    expect(html).toContain('Nộp bài');
  });

  it('renders DocumentPreview with Vietnamese Decree 30/2020 official styling', () => {
    const html = renderToString(<DocumentPreview values={INITIAL_FORM_VALUES} />);
    expect(html).toContain('ĐOÀN KHOA CÔNG NGHỆ THÔNG TIN');
    expect(html).toContain('ĐOÀN TNCS HỒ CHÍ MINH');
    expect(html).toContain('TỜ TRÌNH');
    expect(html).toContain('Ban Thường vụ Đoàn khoa Công nghệ Thông tin');
    expect(html).toContain('Trần Minh Khoa');
  });

  it('renders Screen 3 (UC-A07 & UC-A08: Content Check & Suggestions) correctly', () => {
    const html = renderToString(
      <Screen3ContentCheck
        values={INITIAL_FORM_VALUES}
        onChangeValues={() => {}}
        onNavigate={() => {}}
      />
    );
    expect(html).toContain('Kiểm tra nội dung');
    expect(html).toContain('Sai luật tự động');
    expect(html).toContain('Cần bổ sung');
    expect(html).toContain('Không chắc chắn');
    expect(html).toContain('Gợi ý sửa lỗi nhỏ');
    expect(html).toContain('Nhận tất cả');
  });

  it('renders Screen 4 (UC-B03: Assign Work from a Form) correctly', () => {
    const html = renderToString(<Screen4AssignWork onNavigate={() => {}} />);
    expect(html).toContain('Giao việc từ công việc này');
    expect(html).toContain('Nội dung chương trình');
    expect(html).toContain('Dự trù kinh phí chi tiết');
    expect(html).toContain('Tổng kinh phí');
    expect(html).toContain('Phạm Thị Vy');
    expect(html).toContain('Ngô Quang');
    expect(html).toContain('Muộn hơn hạn của công việc gốc');
  });

  it('renders Screen 5 (UC-B05: Review a Submission) correctly', () => {
    const html = renderToString(<Screen5ReviewSubmission onNavigate={() => {}} />);
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
      <Screen6IntegrateResults
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
