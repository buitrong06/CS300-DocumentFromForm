import { useState } from 'react';
import type { FillDocumentValues } from '../state';

interface DocumentPreviewCardProps {
  values: FillDocumentValues;
  title?: string;
  compact?: boolean;
}

/**
 * Interactive live document preview function integrated into Filling, Config, and Export screens.
 * Supports zoom toggle and live reflection of form values.
 */
export function DocumentPreviewCard({ values, title = 'Xem trước tài liệu', compact = false }: DocumentPreviewCardProps) {
  const [zoom, setZoom] = useState<100 | 90 | 110>(100);

  return (
    <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="fapp-section-title" style={{ margin: 0 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="fapp-btn fapp-btn-secondary fapp-btn-sm"
            onClick={() => setZoom((z) => (z === 110 ? 100 : 90))}
            aria-label="Thu nhỏ xem trước"
          >
            −
          </button>
          <span style={{ fontSize: 12, color: '#64748b', minWidth: 38, textAlign: 'center' }}>{zoom}%</span>
          <button
            type="button"
            className="fapp-btn fapp-btn-secondary fapp-btn-sm"
            onClick={() => setZoom((z) => (z === 90 ? 100 : 110))}
            aria-label="Phóng to xem trước"
          >
            +
          </button>
        </div>
      </div>

      <div
        className="fapp-paper"
        style={{
          fontSize: compact ? 12.5 : Math.round(13.5 * (zoom / 100)),
          minHeight: compact ? 240 : 320,
        }}
      >
        <div style={{ textAlign: 'center', fontSize: 12, marginBottom: 14, color: '#334155' }}>
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </div>
        <div className="fapp-paper-heading">BẢN KHAI ĐĂNG KÝ TÊN ĐỊNH DANH</div>
        <p style={{ margin: '0 0 10px' }}>
          <strong>Họ và tên:</strong>{' '}
          <span style={{ color: values.fullName ? '#111827' : '#b91c1c' }}>
            {values.fullName || '[Chưa nhập họ và tên]'}
          </span>
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <strong>Số định danh:</strong>{' '}
          <span style={{ color: values.nationalId ? '#111827' : '#b91c1c' }}>
            {values.nationalId || '[Chưa nhập số định danh]'}
          </span>
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <strong>Ngày sinh:</strong>{' '}
          <span style={{ color: values.birthDate ? '#111827' : '#b91c1c' }}>
            {values.birthDate || '[Chưa nhập ngày sinh]'}
          </span>
        </p>
        {values.mainContent.trim() ? (
          <p style={{ margin: '14px 0 0', whiteSpace: 'pre-wrap' }}>
            <strong>Nội dung chính:</strong> {values.mainContent}
          </p>
        ) : (
          <p style={{ margin: '14px 0 0', color: '#94a3b8', fontStyle: 'italic' }}>
            Nội dung chính sẽ hiển thị tại đây khi bạn nhập...
          </p>
        )}
      </div>
    </div>
  );
}
