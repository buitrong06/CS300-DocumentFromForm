import { useState } from 'react';
import { Link } from 'react-router-dom';

/** Overview screen — matches Figma 4:2 (Người giao) and 102:84 (Người nhận) */
export function OverviewScreen() {
  const [role, setRole] = useState<'assigner' | 'assignee'>('assigner');

  const assignerMetrics = [
    { label: 'Đang giao', value: '12', note: 'công việc đang mở' },
    { label: 'Tỷ lệ hoàn thành', value: '86%', note: 'trên các công việc đã giao' },
    { label: 'Sắp đến hạn', value: '3', note: 'trong 48 giờ' },
    { label: 'Cần xử lý', value: '2', note: 'bài nộp có vấn đề' },
  ];

  const assigneeMetrics = [
    { label: 'Được giao', value: '5', note: 'công việc' },
    { label: 'Đang làm', value: '2', note: 'công việc' },
    { label: 'Sắp đến hạn', value: '1', note: 'trong 24 giờ' },
    { label: 'Đã hoàn thành', value: '2', note: 'công việc' },
  ];

  const assignerTasks = [
    { name: 'Đăng ký tên định danh', assignee: 'Nguyễn Minh Anh', deadline: 'Còn 6 giờ', status: 'Đang làm', chip: 'fapp-chip-violet', to: '/app/tasks/fill' },
    { name: 'Tờ khai CC01', assignee: 'Trần Minh', deadline: 'Còn 1 ngày', status: 'Nộp lỗi', chip: 'fapp-chip-red', to: '/app/tasks/check' },
    { name: 'Mẫu tờ trình chung', assignee: 'Lê Hà', deadline: 'Còn 2 ngày', status: 'Chờ nộp', chip: 'fapp-chip-yellow', to: '/app/tasks' },
  ];

  const assigneeTasks = [
    { name: 'Đăng ký tên định danh', deadline: 'Còn 6 giờ', action: 'Bắt đầu điền', to: '/app/tasks/fill' },
    { name: 'Tờ khai CC01', deadline: 'Còn 1 ngày', action: 'Nộp lại', to: '/app/tasks/fill' },
    { name: 'Mẫu tờ trình chung', deadline: 'Đã hoàn thành', action: 'Xem kết quả', to: '/app/tasks/check' },
  ];

  const updates = [
    { initial: 'M', note: 'Đã nộp lại Tờ khai CC01', time: '10 phút trước' },
    { initial: 'H', note: 'Cần phản hồi về ngày cấp', time: '1 giờ trước' },
    { initial: 'L', note: 'Đã hoàn tất biểu mẫu', time: 'Hôm qua' },
  ];

  const metrics = role === 'assigner' ? assignerMetrics : assigneeMetrics;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="fapp-actions">
          <button
            type="button"
            className={`fapp-btn fapp-btn-sm ${role === 'assigner' ? 'fapp-btn-primary' : 'fapp-btn-secondary'}`}
            onClick={() => setRole('assigner')}
          >
            Người giao
          </button>
          <button
            type="button"
            className={`fapp-btn fapp-btn-sm ${role === 'assignee' ? 'fapp-btn-primary' : 'fapp-btn-secondary'}`}
            onClick={() => setRole('assignee')}
          >
            Người nhận
          </button>
        </div>
      </div>

      <div className="fapp-metrics-grid">
        {metrics.map((m) => (
          <div key={m.label} className="fapp-metric-card">
            <div className="fapp-metric-label">{m.label}</div>
            <div className="fapp-metric-value">{m.value}</div>
            <div className="fapp-metric-note">{m.note}</div>
          </div>
        ))}
      </div>

      {role === 'assigner' ? (
        <>
          <div className="fapp-overview-grid">
            <div className="fapp-card">
              <div style={{ marginBottom: 16 }}>
                <div className="fapp-section-title">Công việc cần chú ý</div>
                <p className="fapp-section-help">Ưu tiên theo hạn nộp và trạng thái bài nộp.</p>
              </div>
              <div className="fapp-row-list">
                {assignerTasks.map((t) => (
                  <div key={t.name} className="fapp-row-item">
                    <div>
                      <Link to={t.to} style={{ fontWeight: 600, color: '#111827', textDecoration: 'none' }}>{t.name}</Link>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>{t.deadline}</div>
                    </div>
                    <div style={{ fontSize: 13.5, color: '#475569' }}>{t.assignee}</div>
                    <span className={`fapp-chip ${t.chip}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="fapp-card">
              <div className="fapp-section-title" style={{ marginBottom: 16 }}>Thông tin mới</div>
              <div className="fapp-row-list">
                {updates.map((u) => (
                  <div key={u.note} className="fapp-row-item" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                    <div className="fapp-avatar" style={{ width: 32, height: 32, borderRadius: '50%' }}>{u.initial}</div>
                    <div>
                      <div style={{ fontSize: 13.5, color: '#111827', fontWeight: 500 }}>{u.note}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{u.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="fapp-actions">
            <Link to="/app/tasks/assign" className="fapp-btn fapp-btn-primary">Giao việc mới</Link>
            <Link to="/app/tasks" className="fapp-btn fapp-btn-secondary">Theo dõi công việc</Link>
          </div>
        </>
      ) : (
        <div className="fapp-card">
          <div style={{ marginBottom: 16 }}>
            <div className="fapp-section-title">Việc của tôi</div>
            <p className="fapp-section-help">Mỗi việc đi kèm bộ tài liệu cần thiết.</p>
          </div>
          <div className="fapp-row-list">
            {assigneeTasks.map((t) => (
              <div key={t.name} className="fapp-row-item">
                <div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{t.name}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>{t.deadline}</div>
                </div>
                <Link to={t.to} className="fapp-btn fapp-btn-secondary">{t.action}</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
