import React, { useState } from 'react';
import { Add16Regular, Subtract16Regular } from '@fluentui/react-icons';
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
    if (!dateStr) return 'ngày … tháng … năm …';
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
      <div className="pa02-preview-toolbar">
        <div className="pa02-preview-toolbar-row">
          <strong>Xem trước</strong>
          {!isCollapsed && (
            <div className="pa02-zoom" role="group" aria-label="Thu phóng bản xem trước">
              <button type="button" aria-label="Thu nhỏ bản xem trước" title="Thu nhỏ" disabled={zoom === 70} onClick={() => setZoom((value) => Math.max(70, value - 10))}>
                <Subtract16Regular aria-hidden="true" />
              </button>
              <output aria-label="Tỷ lệ thu phóng">{`${zoom}%`}</output>
              <button type="button" aria-label="Phóng to bản xem trước" title="Phóng to" disabled={zoom === 130} onClick={() => setZoom((value) => Math.min(130, value + 10))}>
                <Add16Regular aria-hidden="true" />
              </button>
            </div>
          )}
          {onToggleCollapse && (
            <button type="button" className="btn btn-secondary btn-sm" aria-expanded={!isCollapsed} onClick={onToggleCollapse}>
              {isCollapsed ? 'Mở rộng ⇤' : 'Thu gọn ⇥'}
            </button>
          )}
        </div>
        <p className="pa02-preview-caption">Mẫu minh họa theo Nghị định 30/2020</p>
        {!isCollapsed && (
          <ul className="pa02-preview-legend" aria-label="Chú giải">
            <li>Đã điền</li>
            <li>Còn thiếu</li>
          </ul>
        )}
      </div>

      {!isCollapsed && (
        <div className="pa02-preview-surface" tabIndex={zoom > 100 ? 0 : undefined} role="region" aria-label="Trang tài liệu">
          <div className="paper-sheet" style={{ transform: `scale(${zoom / 100})`, transformOrigin: zoom > 100 ? 'top left' : 'top center' }}>
            {/* Header */}
            <div className="doc-header-grid">
              <div>
                <div className="doc-org-top">ĐOÀN KHOA CÔNG NGHỆ THÔNG TIN</div>
                <div className="doc-org-sub">{values.unit.trim() ? values.unit.toUpperCase() : <span className="doc-chip-missing">[Đơn vị]</span>}</div>
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
                Về việc xin kinh phí tổ chức {values.activityName.trim() || <span className="doc-chip-missing">[Tên hoạt động]</span>}
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
              BCH {values.unit.trim() || <span className="doc-chip-missing">[Đơn vị]</span>} kính trình Ban Thường vụ xem xét, phê duyệt kinh phí tổ chức{' '}
              {values.activityName.trim() || <span className="doc-chip-missing">[Tên hoạt động]</span>}, dự kiến diễn ra vào ngày{' '}
              {values.eventDate ? formatShortDate(values.eventDate) : <span className="doc-chip-missing">[Thời gian tổ chức]</span>} tại {values.location.trim() || <span className="doc-chip-missing">[Địa điểm]</span>}.
            </p>

            {/* Content Points */}
            <div style={{ margin: '14px 0' }}>
              <p className="doc-paragraph">
                <strong>1. Mục đích: </strong>
                {values.purpose.trim() ? (
                  <span className="doc-chip-filled">{values.purpose}</span>
                ) : (
                  <span className="doc-chip-missing">[Mục đích]</span>
                )}
              </p>

              <p className="doc-paragraph">
                <strong>2. Nội dung chương trình: </strong>
                {values.programSchedule.trim() ? (
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
                  {values.signatory.trim() || <span className="doc-chip-missing">[Người ký]</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
