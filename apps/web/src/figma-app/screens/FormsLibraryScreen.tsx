import { useState } from 'react';
import { Link } from 'react-router-dom';

const FORMS = [
  { id: '1', name: 'Tờ khai thông tin cư trú', meta: '8 trường · Cập nhật 18 phút trước', status: 'Đã hoàn tất', chip: 'fapp-chip-green', to: '/app/tasks/fill' },
  { id: '2', name: 'Đăng ký tên định danh', meta: '14 trường · Cập nhật hôm qua', status: 'Đang duyệt', chip: 'fapp-chip-violet', to: '/app/tasks/fill' },
  { id: '3', name: 'Mẫu tờ trình chung', meta: '6 trường · Cập nhật 21/10', status: 'Nháp', chip: 'fapp-chip-gray', to: '/app/forms/config' },
  { id: '4', name: 'Tờ khai CC01', meta: '11 trường · Cập nhật 17/10', status: 'Đã hoàn tất', chip: 'fapp-chip-green', to: '/app/tasks/fill' },
];

/** Forms Library — matches Figma 17:2 (Thư viện biểu mẫu / Light) */
export function FormsLibraryScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'done'>('all');

  const visible = FORMS.filter((f) => {
    if (filter === 'done' && f.status !== 'Đã hoàn tất') return false;
    if (query.trim() && !f.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="fapp-section-title">Biểu mẫu của bạn</div>
          <p className="fapp-section-help">Chọn biểu mẫu để điền hoặc tạo quy trình mới.</p>
        </div>
        <Link to="/app/forms/new" className="fapp-btn fapp-btn-primary">Tạo biểu mẫu</Link>
      </div>

      <div className="fapp-actions">
        <input
          className="fapp-input"
          style={{ maxWidth: 280 }}
          placeholder="Tìm biểu mẫu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={`fapp-chip ${filter === 'all' ? 'fapp-chip-violet' : 'fapp-chip-gray'}`}
          style={{ border: 'none', cursor: 'pointer' }}
          onClick={() => setFilter('all')}
        >
          Tất cả
        </button>
        <button
          type="button"
          className={`fapp-chip ${filter === 'done' ? 'fapp-chip-violet' : 'fapp-chip-gray'}`}
          style={{ border: 'none', cursor: 'pointer' }}
          onClick={() => setFilter('done')}
        >
          Đã hoàn tất
        </button>
      </div>

      <div className="fapp-card">
        <div className="fapp-row-list">
          {visible.map((f) => (
            <div key={f.id} className="fapp-row-item">
              <div>
                <div style={{ fontWeight: 600, color: '#111827' }}>{f.name}</div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>{f.meta}</div>
              </div>
              <div className="fapp-actions">
                <span className={`fapp-chip ${f.chip}`}>{f.status}</span>
                <Link to={f.to} style={{ fontSize: 13.5, fontWeight: 600, color: '#4f38c7', textDecoration: 'none', marginLeft: 12 }}>
                  Điền ngay
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
