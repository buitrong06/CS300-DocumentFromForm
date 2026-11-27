import { useState } from 'react';
import { Link } from 'react-router-dom';

const TASKS = [
  { name: 'Đăng ký tên định danh', assignee: 'Nguyễn Minh Anh', due: '29/11 · 18:00', status: 'Đang làm', chip: 'fapp-chip-violet', bundle: '3 tệp', to: '/app/tasks/fill' },
  { name: 'Tờ khai CC01', assignee: 'Trần Minh', due: '30/11 · 18:00', status: 'Nộp lỗi', chip: 'fapp-chip-red', bundle: '2 tệp', to: '/app/tasks/check' },
  { name: 'Mẫu tờ trình chung', assignee: 'Lê Hà', due: '02/12 · 18:00', status: 'Chờ nộp', chip: 'fapp-chip-yellow', bundle: '3 tệp', to: '/app/tasks/fill' },
];

const TABS = ['Tất cả', 'Đang làm', 'Chờ nộp', 'Cần xử lý'] as const;

/** Task Tracking screen — matches Figma 105:52 (Theo dõi công việc / Light) */
export function TaskTrackScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Tất cả');

  const visible = TASKS.filter((t) => {
    if (tab === 'Tất cả') return true;
    if (tab === 'Cần xử lý') return t.status === 'Nộp lỗi';
    return t.status === tab;
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div className="fapp-actions">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`fapp-chip ${tab === t ? 'fapp-chip-violet' : 'fapp-chip-gray'}`}
              style={{ border: 'none', cursor: 'pointer' }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="fapp-actions">
          <Link to="/app/inbox" className="fapp-btn fapp-btn-secondary">Trao đổi</Link>
          <Link to="/app/tasks/assign" className="fapp-btn fapp-btn-primary">Giao việc mới</Link>
        </div>
      </div>

      <div className="fapp-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 120px 100px', gap: 12, paddingBottom: 12, borderBottom: '1px solid #eef2f7', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
          <span>Công việc</span>
          <span>Người nhận</span>
          <span>Hạn nộp</span>
          <span>Trạng thái</span>
          <span>Bộ tài liệu</span>
        </div>

        <div className="fapp-row-list">
          {visible.map((t) => (
            <div
              key={t.name}
              style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 120px 100px', gap: 12, alignItems: 'center', padding: '18px 0', borderBottom: '1px solid #eef2f7' }}
            >
              <Link to={t.to} style={{ fontWeight: 600, color: '#111827', textDecoration: 'none' }}>{t.name}</Link>
              <span style={{ fontSize: 13.5, color: '#475569' }}>{t.assignee}</span>
              <span style={{ fontSize: 13.5, color: '#475569' }}>{t.due}</span>
              <span><span className={`fapp-chip ${t.chip}`}>{t.status}</span></span>
              <span style={{ fontSize: 13, color: '#64748b' }}>{t.bundle}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fapp-footer-bar">
        <Link to="/app/forms" className="fapp-btn fapp-btn-secondary">Xem biểu mẫu</Link>
      </div>
    </>
  );
}
