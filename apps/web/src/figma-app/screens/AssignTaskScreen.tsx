import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const BUNDLE_FILES = [
  { type: 'Mẫu DOCX', name: 'Bản khai đăng ký tên định danh.docx' },
  { type: 'Hướng dẫn điền', name: 'Huong_dan_dien_form.pdf' },
  { type: 'Checklist', name: 'Checklist kiểm tra nội dung' },
];

/** Assign Task screen — matches Figma 105:2 (Giao việc / Light) */
export function AssignTaskScreen() {
  const navigate = useNavigate();
  const [assignee, setAssignee] = useState('Nguyễn Minh Anh');
  const [due, setDue] = useState('2026-11-30');
  const [note, setNote] = useState('Vui lòng kiểm tra checklist trước khi nộp.');

  return (
    <>
      <div className="fapp-two-col">
        <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="fapp-section-title">Bộ tài liệu giao việc</div>
              <div className="fapp-section-help">Đăng ký tên định danh</div>
            </div>
            <span className="fapp-chip fapp-chip-green">14 trường · đã hoàn tất</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {BUNDLE_FILES.map((f) => (
              <div
                key={f.name}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9 }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4f38c7', minWidth: 120 }}>{f.type}</span>
                <span style={{ fontSize: 13.5, color: '#111827' }}>{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fapp-card">
          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="assign-member">Người nhận *</label>
            <select id="assign-member" className="fapp-input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option>Nguyễn Minh Anh</option>
              <option>Trần Minh</option>
              <option>Lê Hà</option>
            </select>
          </div>

          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="assign-due">Hạn nộp</label>
            <input id="assign-due" className="fapp-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>

          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="assign-note">Ghi chú</label>
            <textarea id="assign-note" className="fapp-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="fapp-footer-bar">
        <Link to="/app/forms" className="fapp-btn fapp-btn-secondary">Quay lại biểu mẫu</Link>
        <button type="button" className="fapp-btn fapp-btn-primary" onClick={() => navigate('/app/tasks')}>
          Giao việc
        </button>
      </div>
    </>
  );
}
