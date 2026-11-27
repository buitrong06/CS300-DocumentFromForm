import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FillDocumentValues } from '../state';
import { DocumentPreviewCard } from '../components/DocumentPreviewCard';

interface FormFillingScreenProps {
  values: FillDocumentValues;
  onChange: (patch: Partial<FillDocumentValues>) => void;
  onNotify: (title: string, detail: string) => void;
}

/**
 * Form Filling — matches Figma 4:134 (Điền biểu mẫu / Light).
 * Integrates live DocumentPreviewCard as an interactive side-by-side / toggleable function.
 */
export function FormFillingScreen({ values, onChange, onNotify }: FormFillingScreenProps) {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
          Đăng ký tên định danh · giao cho Nguyễn Minh Anh
        </div>
        <div className="fapp-actions">
          <span className="fapp-chip fapp-chip-violet">Đang làm</span>
          <button
            type="button"
            className="fapp-btn fapp-btn-secondary fapp-btn-sm"
            onClick={() => setShowPreview((p) => !p)}
          >
            {showPreview ? 'Ẩn xem trước' : 'Hiện xem trước'}
          </button>
        </div>
      </div>

      <div className={showPreview ? 'fapp-two-col' : undefined}>
        <div className="fapp-card">
          <div className="fapp-section-title" style={{ marginBottom: 20 }}>Thông tin cần điền</div>

          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="fill-name">Họ và tên *</label>
            <input
              id="fill-name"
              className="fapp-input"
              value={values.fullName}
              onChange={(e) => onChange({ fullName: e.target.value })}
            />
          </div>

          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="fill-nid">Số định danh cá nhân *</label>
            <input
              id="fill-nid"
              className="fapp-input"
              value={values.nationalId}
              onChange={(e) => onChange({ nationalId: e.target.value })}
            />
          </div>

          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="fill-dob">Ngày sinh *</label>
            <input
              id="fill-dob"
              className="fapp-input"
              value={values.birthDate}
              onChange={(e) => onChange({ birthDate: e.target.value })}
            />
          </div>

          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="fill-content">Nội dung chính</label>
            <textarea
              id="fill-content"
              className="fapp-input"
              rows={3}
              placeholder="Nhập nội dung..."
              value={values.mainContent}
              onChange={(e) => onChange({ mainContent: e.target.value })}
            />
          </div>
        </div>

        {showPreview && <DocumentPreviewCard values={values} title="Xem trước tài liệu" />}
      </div>

      <div className="fapp-footer-bar">
        <Link to="/app/tasks" className="fapp-btn fapp-btn-secondary">Quay lại công việc</Link>
        <div className="fapp-actions">
          <button
            type="button"
            className="fapp-btn fapp-btn-secondary"
            onClick={() => onNotify('Đã lưu bản nháp', 'Thay đổi của bạn đã được lưu vào workspace.')}
          >
            Lưu nháp
          </button>
          <Link to="/app/tasks/check" className="fapp-btn fapp-btn-secondary">Kiểm tra nội dung</Link>
          <Link to="/app/tasks/export" className="fapp-btn fapp-btn-primary">Nộp bài</Link>
        </div>
      </div>
    </>
  );
}
