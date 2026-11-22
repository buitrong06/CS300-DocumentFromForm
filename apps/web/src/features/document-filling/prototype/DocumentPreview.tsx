import React, { useState } from 'react';
import type { FormValues } from '../model';

interface DocumentPreviewProps {
  values: FormValues;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  values,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [zoom, setZoom] = useState(100);

  // Format date helper: YYYY-MM-DD -> ngày DD tháng MM năm YYYY
  const formatDateVietnamese = (dateStr: string) => {
    if (!dateStr) return 'ngày ..... tháng ..... năm 2026';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
    }
    return dateStr;
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '...';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className={`document-preview-pane ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="preview-top-toolbar">
        <div>
          <strong>Xem trước</strong> · giống hệt file xuất ra · preset <strong>Nghị định 30/2020</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            <span style={{ color: '#2563eb' }}>xanh</span> = nội dung bạn nhập · <span style={{ color: '#dc2626' }}>đỏ</span> = còn thiếu
          </span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
            <button
              className="toolbar-btn"
              onClick={() => setZoom((z) => Math.max(70, z - 10))}
              title="Thu nhỏ"
            >
              -
            </button>
            <span style={{ fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>{zoom}%</span>
            <button
              className="toolbar-btn"
              onClick={() => setZoom((z) => Math.min(130, z + 10))}
              title="Phóng to"
            >
              +
            </button>
          </div>
          {onToggleCollapse && (
            <button className="btn btn-secondary btn-sm" onClick={onToggleCollapse}>
              {isCollapsed ? 'Mở rộng ⇤' : 'Thu gọn ⇥'}
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div
          className="paper-sheet"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
        >
          {/* Header */}
          <div className="doc-header-grid">
            <div>
              <div className="doc-org-top">ĐOÀN KHOA CÔNG NGHỆ THÔNG TIN</div>
              <div className="doc-org-sub">{values.unit ? values.unit.toUpperCase() : 'BCH CHI ĐOÀN 23CTT1'}</div>
              <div className="doc-divider-star">***</div>
            </div>
            <div>
              <div className="doc-motto-top">ĐOÀN TNCS HỒ CHÍ MINH</div>
              <div className="doc-location-date">
                TP. Hồ Chí Minh, {formatDateVietnamese(values.createDate)}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="doc-title-block">
            <div className="doc-title-main">TỜ TRÌNH</div>
            <div className="doc-title-desc">
              Về việc xin kinh phí tổ chức {values.activityName || 'Ngày hội Tân sinh viên 2026'}
            </div>
          </div>

          {/* Salutation */}
          <div className="doc-greeting">
            Kính gửi: Ban Thường vụ Đoàn khoa Công nghệ Thông tin
          </div>

          {/* Lead-in */}
          <p className="doc-paragraph">
            Căn cứ kế hoạch công tác năm học 2026 - 2027 của Đoàn khoa Công nghệ Thông tin;
          </p>
          <p className="doc-paragraph">
            BCH {values.unit || 'Chi đoàn 23CTT1'} kính trình Ban Thường vụ xem xét, phê duyệt kinh phí tổ chức{' '}
            {values.activityName || 'Ngày hội Tân sinh viên 2026'}, dự kiến diễn ra vào ngày{' '}
            {formatShortDate(values.eventDate)} tại {values.location || 'Sảnh tòa I, cơ sở Nguyễn Văn Cừ'}.
          </p>

          {/* Content Points */}
          <div style={{ margin: '14px 0' }}>
            <p className="doc-paragraph">
              <strong>1. Mục đích: </strong>
              {values.purpose ? (
                <span className="doc-chip-filled">{values.purpose}</span>
              ) : (
                <span className="doc-chip-missing">[Mục đích]</span>
              )}
            </p>

            <p className="doc-paragraph">
              <strong>2. Nội dung chương trình: </strong>
              {values.programSchedule ? (
                <span className="doc-chip-filled" style={{ whiteSpace: 'pre-line' }}>
                  {values.programSchedule}
                </span>
              ) : (
                <span className="doc-chip-missing">[Nội dung chương trình]</span>
              )}
            </p>

            <p className="doc-paragraph">
              <strong>3. Kinh phí: </strong>
              tổng kinh phí dự kiến{' '}
              {values.totalBudget > 0 ? (
                <span className="doc-chip-filled">
                  {values.totalBudget.toLocaleString('vi-VN')}
                </span>
              ) : (
                <span className="doc-chip-missing">[Tổng kinh phí]</span>
              )}{' '}
              đồng.
            </p>
          </div>

          <p className="doc-paragraph">
            Kính trình Ban Thường vụ Đoàn khoa xem xét, phê duyệt.
          </p>

          {/* Signatures */}
          <div className="doc-sign-block">
            <div className="doc-recipient-col">
              <div className="doc-recipient-title">Nơi nhận:</div>
              <div>- Như trên;</div>
              <div>- Lưu VP.</div>
            </div>
            <div className="doc-signer-col">
              <div className="doc-signer-title">TM. BAN CHẤP HÀNH</div>
              <div className="doc-signer-title">BÍ THƯ</div>
              <div className="doc-signer-space" />
              <div className="doc-signer-name" style={{ color: '#1e40af' }}>
                {values.signatory || 'Trần Minh Khoa'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
