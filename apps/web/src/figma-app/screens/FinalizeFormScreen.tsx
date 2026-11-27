import { Link } from 'react-router-dom';

const SUMMARY = [
  { label: 'Tên biểu mẫu', value: 'Đăng ký tên định danh' },
  { label: 'Trường', value: '14 trường đã duyệt' },
  { label: 'Checklist', value: '4/4 đã xác nhận' },
  { label: 'Nguồn', value: 'Bản khai đăng ký tên định danh.docx' },
  { label: 'Phiên bản', value: 'v1 · Đã hoàn tất' },
];

/** Finalize Form screen — matches Figma 17:204 (Hoàn tất biểu mẫu / Light) */
export function FinalizeFormScreen() {
  return (
    <>
      <div>
        <div className="fapp-section-title" style={{ fontSize: 20 }}>Biểu mẫu đã sẵn sàng để giao việc.</div>
        <p className="fapp-section-help">Biểu mẫu được lưu trong workspace và có thể giao cho thành viên.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 28, alignItems: 'start' }}>
        <div className="fapp-card">
          <div className="fapp-row-list">
            {SUMMARY.map((s) => (
              <div key={s.label} className="fapp-row-item">
                <span style={{ fontSize: 13.5, color: '#64748b', minWidth: 160 }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="fapp-section-title">Tiếp theo</div>
          <p className="fapp-section-help">Giao biểu mẫu cùng bộ tài liệu cần thiết.</p>
        </div>
      </div>

      <div className="fapp-footer-bar">
        <Link to="/app/forms/checklist" className="fapp-btn fapp-btn-secondary">Quay lại kiểm tra</Link>
        <Link to="/app/tasks/assign" className="fapp-btn fapp-btn-primary">Giao việc</Link>
      </div>
    </>
  );
}
