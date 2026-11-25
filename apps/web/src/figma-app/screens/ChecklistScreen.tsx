import { Link } from 'react-router-dom';

const CHECKS = [
  { name: 'Trường bắt buộc', detail: 'Tất cả trường bắt buộc đã có quy tắc.', status: 'Đã xác nhận' },
  { name: 'Kiểu dữ liệu', detail: 'Các trường đã có kiểu dữ liệu.', status: 'Đã xác nhận' },
  { name: 'Độ dài mã định danh', detail: 'Đúng 12 chữ số.', status: 'Đã xác nhận' },
  { name: 'Ngày tháng', detail: 'Định dạng ngày đã được cấu hình.', status: 'Đã xác nhận' },
];

/** Checklist screen — matches Figma 17:150 (Danh sách kiểm tra / Light) */
export function ChecklistScreen() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Đăng ký tên định danh</div>
        <span className="fapp-chip fapp-chip-green">4/4 đã xác nhận</span>
      </div>

      <div className="fapp-card">
        <div style={{ marginBottom: 16 }}>
          <div className="fapp-section-title">Điều kiện của biểu mẫu</div>
          <p className="fapp-section-help">Xác nhận các điều kiện trước khi hoàn tất biểu mẫu.</p>
        </div>

        <div className="fapp-row-list">
          {CHECKS.map((c) => (
            <div key={c.name} className="fapp-row-item">
              <div style={{ minWidth: 200, fontWeight: 600, color: '#111827' }}>{c.name}</div>
              <div style={{ flex: 1, fontSize: 13.5, color: '#64748b' }}>{c.detail}</div>
              <span className="fapp-chip fapp-chip-green">{c.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fapp-footer-bar">
        <Link to="/app/forms/config" className="fapp-btn fapp-btn-secondary">Quay lại cấu hình</Link>
        <Link to="/app/forms/finalize" className="fapp-btn fapp-btn-primary">Hoàn tất biểu mẫu</Link>
      </div>
    </>
  );
}
