import { Link } from 'react-router-dom';
import type { FillDocumentValues } from '../state';

/** Content Check Results — matches Figma 17:280 (Kết quả kiểm tra nội dung / Light) */
export function ContentCheckResultScreen({ values }: { values: FillDocumentValues }) {
  const evidence = [
    { name: 'Trường bắt buộc', chip: 'Đạt', chipClass: 'fapp-chip-green', detail: 'Tất cả 8 trường đã chấp nhận đều có giá trị.' },
    { name: 'Độ dài mã định danh', chip: 'Đạt', chipClass: 'fapp-chip-green', detail: `${values.nationalId || '079204001234'} có 12 chữ số.` },
    { name: 'Mục đích văn bản', chip: 'Cảnh báo', chipClass: 'fapp-chip-yellow', detail: 'Đã có câu trả lời, nhưng cần bổ sung bằng chứng.' },
    { name: 'Tính nhất quán ngày', chip: 'Đạt', chipClass: 'fapp-chip-green', detail: `${values.birthDate || '24/10/2002'} là ngày hợp lệ.` },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
          Đăng ký tên định danh · {values.fullName || 'Nguyễn Minh Anh'}
        </div>
        <span className="fapp-chip fapp-chip-green">3 đạt · 1 cảnh báo · có thể xuất</span>
      </div>

      <div className="fapp-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>Đạt</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>3</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>Cảnh báo</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#b45309' }}>1</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>Bị chặn</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>0</div>
        </div>
      </div>

      <div className="fapp-card">
        <div className="fapp-section-title" style={{ marginBottom: 16 }}>Kiểm tra và bằng chứng</div>
        <div className="fapp-row-list">
          {evidence.map((e) => (
            <div key={e.name} className="fapp-row-item">
              <div style={{ minWidth: 200, fontWeight: 600, color: '#111827' }}>{e.name}</div>
              <div><span className={`fapp-chip ${e.chipClass}`}>{e.chip}</span></div>
              <div style={{ flex: 1, fontSize: 13.5, color: '#64748b' }}>{e.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="fapp-footer-bar">
        <Link to="/app/tasks/fill" className="fapp-btn fapp-btn-secondary">← Quay lại điền form</Link>
        <Link to="/app/tasks/export" className="fapp-btn fapp-btn-primary">Xuất tài liệu</Link>
      </div>
    </>
  );
}
