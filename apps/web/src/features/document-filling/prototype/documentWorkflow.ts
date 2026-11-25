import type { FormValues } from '../model';

export const DOCUMENT_TITLE = 'Tờ trình xin kinh phí Ngày hội Tân sinh viên';
export const DOCUMENT_DUE_DATE = '2026-11-05';
export const DOCUMENT_DUE_LABEL = DOCUMENT_DUE_DATE.split('-').reverse().join('/');
export const DOCUMENT_STEPS = ['Điền biểu mẫu', 'Kiểm tra nội dung', 'Xuất tài liệu'] as const;

export const REQUIRED_FIELDS = [
  { key: 'unit', label: 'Đơn vị' },
  { key: 'createDate', label: 'Ngày lập' },
  { key: 'activityName', label: 'Tên hoạt động' },
  { key: 'eventDate', label: 'Thời gian tổ chức' },
  { key: 'location', label: 'Địa điểm' },
  { key: 'purpose', label: 'Mục đích' },
  { key: 'programSchedule', label: 'Nội dung chương trình' },
  { key: 'totalBudget', label: 'Tổng kinh phí' },
  { key: 'signatory', label: 'Người ký' },
] as const;

export type RequiredFieldKey = (typeof REQUIRED_FIELDS)[number]['key'];

export function missingRequiredFields(values: FormValues) {
  return REQUIRED_FIELDS.filter(({ key }) => {
    const value = values[key];
    return typeof value === 'number' ? !Number.isFinite(value) || value <= 0 : !value.trim();
  });
}

export function documentExportIssues(values: FormValues) {
  const issues = missingRequiredFields(values).map(({ key, label }) => ({
    key,
    label,
    message: key === 'totalBudget' ? 'Nhập tổng kinh phí lớn hơn 0.' : 'Cần điền trường này.',
  }));
  if (values.createDate && values.eventDate && values.eventDate <= values.createDate) {
    issues.push({ key: 'eventDate', label: 'Thời gian tổ chức', message: 'Chọn ngày sau ngày lập văn bản.' });
  }
  return issues;
}
