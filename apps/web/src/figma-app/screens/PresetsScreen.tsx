import { Link } from 'react-router-dom';

const PRESETS = [
  {
    name: 'Nghị định 30/2020/NĐ-CP',
    desc: 'Thể thức văn bản hành chính',
    rules: 'Built-in · 14 rules',
    status: 'Verified',
    chip: 'fapp-chip-green',
  },
  {
    name: 'Thể thức văn bản Đoàn',
    desc: 'Mẫu văn bản tổ chức Đoàn',
    rules: 'Built-in · 9 rules',
    status: 'Verified',
    chip: 'fapp-chip-green',
  },
  {
    name: 'Organization custom',
    desc: 'Import từ sample DOCX',
    rules: 'Chưa review · 0 rules',
    status: 'Draft',
    chip: 'fapp-chip-gray',
  },
];

/** Presets Library — matches Figma 51:3 (Presets library / Light) */
export function PresetsScreen() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="fapp-section-title">Preset đã xác minh</div>
          <p className="fapp-section-help">Mỗi thuộc tính có nguồn, trạng thái review và độ phủ quy tắc.</p>
        </div>
        <Link to="/app/forms/new" className="fapp-btn fapp-btn-primary">+ Import preset</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {PRESETS.map((p) => (
          <div key={p.name} className="fapp-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ minWidth: 260 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{p.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{p.desc}</div>
            </div>
            <div style={{ fontSize: 13, color: '#475569' }}>{p.rules}</div>
            <span className={`fapp-chip ${p.chip}`}>{p.status}</span>
            <Link to="/app/forms/config" style={{ fontSize: 13.5, fontWeight: 600, color: '#4f38c7', textDecoration: 'none' }}>
              Open →
            </Link>
          </div>
        ))}
      </div>

      <div className="fapp-card" style={{ background: '#f8fafc', fontSize: 13, color: '#475569' }}>
        Sample DOCX đọc định dạng tất định; LLM chỉ gán nhãn thành phần để creator review.
      </div>
    </>
  );
}
