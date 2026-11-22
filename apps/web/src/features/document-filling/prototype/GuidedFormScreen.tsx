import React, { useState } from 'react';
import type { FormValues } from '../model';
import type { PrototypeScreenId } from '../../../prototype/navigation';
import { DocumentPreview } from './DocumentPreview';

interface GuidedFormScreenProps {
  values: FormValues;
  onChangeValues: (updater: (prev: FormValues) => FormValues) => void;
  onNavigate: (screen: PrototypeScreenId) => void;
}

export const GuidedFormScreen: React.FC<GuidedFormScreenProps> = ({
  values,
  onChangeValues,
  onNavigate,
}) => {
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [autosaveTime, setAutosaveTime] = useState('23:41');

  const updateField = <K extends keyof FormValues>(key: K, val: FormValues[K]) => {
    onChangeValues((prev) => ({ ...prev, [key]: val }));
    setAutosaveTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
  };

  const handleExport = (format: 'docx' | 'pdf') => {
    setShowExportMenu(false);
    alert(`Đang tạo và tải về file ${format.toUpperCase()} theo quy chuẩn Nghị định 30/2020...`);
  };

  // Count filled required fields (out of 11 in standard template)
  const filledCount = [
    values.unit,
    values.createDate,
    values.activityName,
    values.eventDate,
    values.location,
    values.purpose,
    values.programSchedule,
    values.totalBudget > 0 ? 'yes' : '',
    values.signatory,
  ].filter(Boolean).length;

  const scrollToMissingField = () => {
    const el = document.getElementById('field-schedule') || document.getElementById('field-budget');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      el.focus();
    }
  };

  return (
    <div>
      {/* Sub-header */}
      <div className="sub-header">
        <div className="sub-header-left">
          <div className="breadcrumb">Công việc / Đoàn khoa CNTT</div>
          <div className="page-title">Tờ trình xin kinh phí Ngày hội Tân sinh viên</div>
        </div>

        <div className="sub-header-center">
          <span>Giao bởi <strong>BCH Đoàn khoa</strong></span>
          <span>·</span>
          <span>Hạn <strong>05/11/2026</strong></span>
          <span className="badge badge-blue">Đang làm</span>
        </div>

        <div className="sub-header-right">
          <span style={{ fontSize: '12px', color: '#16a34a' }}>✓ Đã lưu tự động lúc {autosaveTime}</span>

          <button className="btn btn-secondary" onClick={() => onNavigate('screen3')}>
            Kiểm tra nội dung
          </button>

          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary" onClick={() => setShowExportMenu(!showExportMenu)}>
              Xuất file ▾
            </button>
            {showExportMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '4px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 20,
                  minWidth: '150px',
                }}
              >
                <div
                  style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  onClick={() => handleExport('docx')}
                >
                  📄 Xuất bản DOCX
                </div>
                <div
                  style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer' }}
                  onClick={() => handleExport('pdf')}
                >
                  📑 Xuất bản PDF
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              if (confirm('Bạn muốn kiểm tra nội dung và nộp bài lên BCH Đoàn khoa?')) {
                onNavigate('screen3');
              }
            }}
          >
            Nộp bài
          </button>
        </div>
      </div>

      {/* Progress Bar Row */}
      <div className="progress-row">
        <span>
          <strong>{filledCount}/11</strong> trường bắt buộc đã điền
        </span>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(filledCount / 11) * 100}%` }} />
        </div>
        <button
          className="btn btn-sm btn-secondary"
          style={{ border: 'none', color: '#2563eb', padding: '2px 8px' }}
          onClick={scrollToMissingField}
        >
          Đến trường còn thiếu ↓
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('screen4')}>
            + Giao bớt việc cho người khác
          </button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="screen-container">
        <div className={`split-view ${isPreviewCollapsed ? 'collapsed-preview' : ''}`}>
          {/* Left: Input Form */}
          <div className="form-card">
            {/* Group: Thông tin chung */}
            <div className="form-section-title">Thông tin chung</div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Đơn vị *</label>
                <input
                  className="form-input"
                  value={values.unit}
                  onChange={(e) => updateField('unit', e.target.value)}
                  placeholder="VD: Chi đoàn 23CTT1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày lập *</label>
                <input
                  type="date"
                  className="form-input"
                  value={values.createDate}
                  onChange={(e) => updateField('createDate', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tên hoạt động *</label>
              <input
                className="form-input"
                value={values.activityName}
                onChange={(e) => updateField('activityName', e.target.value)}
                placeholder="VD: Ngày hội Tân sinh viên 2026"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Thời gian tổ chức *</label>
                <input
                  type="date"
                  className="form-input"
                  value={values.eventDate}
                  onChange={(e) => updateField('eventDate', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Địa điểm *</label>
                <input
                  className="form-input"
                  value={values.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="VD: Sảnh tòa I, cơ sở Nguyễn Văn Cừ"
                />
              </div>
            </div>

            {/* Group: Nội dung tờ trình */}
            <div className="form-section-title" style={{ marginTop: '10px' }}>Nội dung tờ trình</div>

            <div className="form-group">
              <label className="form-label">Mục đích *</label>
              <span className="form-help">Nêu mục đích và đối tượng tham gia. Tối thiểu 2 câu.</span>
              <div className="rich-editor-box">
                <div className="rich-editor-toolbar">
                  <button className="toolbar-btn" title="Bold" type="button"><b>B</b></button>
                  <button className="toolbar-btn" title="Italic" type="button"><i>I</i></button>
                  <button className="toolbar-btn" title="Underline" type="button"><u>U</u></button>
                  <button className="toolbar-btn" title="Bullet List" type="button">•=</button>
                  <button className="toolbar-btn" title="Numbered List" type="button">1=</button>
                </div>
                <textarea
                  className="rich-editor-textarea"
                  value={values.purpose}
                  onChange={(e) => updateField('purpose', e.target.value)}
                  rows={3}
                  placeholder="Nhập mục đích tờ trình..."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nội dung chương trình *</label>
              <span className="form-help">Liệt kê các hoạt động chính theo trình tự thời gian.</span>
              <div className="rich-editor-box">
                <div className="rich-editor-toolbar">
                  <button className="toolbar-btn" title="Bold" type="button"><b>B</b></button>
                  <button className="toolbar-btn" title="Italic" type="button"><i>I</i></button>
                  <button className="toolbar-btn" title="Underline" type="button"><u>U</u></button>
                  <button className="toolbar-btn" title="Bullet List" type="button">•=</button>
                  <button className="toolbar-btn" title="Numbered List" type="button">1=</button>
                </div>
                <textarea
                  id="field-schedule"
                  className="rich-editor-textarea"
                  value={values.programSchedule}
                  onChange={(e) => updateField('programSchedule', e.target.value)}
                  rows={4}
                  placeholder="Chưa có nội dung"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tổng kinh phí *</label>
                <span className="form-help">Khớp với tổng của dự trù chi tiết.</span>
                <div className="form-input-addon">
                  <input
                    id="field-budget"
                    type="number"
                    className="form-input"
                    value={values.totalBudget || 0}
                    onChange={(e) => updateField('totalBudget', Number(e.target.value))}
                  />
                  <span className="input-suffix">VNĐ</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Người ký *</label>
                <span className="form-help">Họ tên Bí thư chi đoàn.</span>
                <input
                  className="form-input"
                  value={values.signatory}
                  onChange={(e) => updateField('signatory', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right: Live Preview */}
          <DocumentPreview
            values={values}
            isCollapsed={isPreviewCollapsed}
            onToggleCollapse={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
          />
        </div>
      </div>
    </div>
  );
};
