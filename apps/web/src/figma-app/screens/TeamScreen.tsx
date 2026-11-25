const MEMBERS = [
  { initial: 'P', name: 'Nguyễn Hữu Phước', role: 'Assigner · Owner', state: 'Online', chip: 'fapp-chip-green' },
  { initial: 'T', name: 'Nguyễn Hoàng Thuận Phát', role: 'Assignee · Editor', state: 'Working on 3 forms', chip: 'fapp-chip-violet' },
  { initial: 'L', name: 'Lê Gia Phúc', role: 'Assignee · Reviewer', state: 'Last active 8m ago', chip: 'fapp-chip-gray' },
];

const ACTIVITIES = [
  { text: 'Phước published a preset', time: '8 min ago' },
  { text: 'Phát updated a draft', time: '24 min ago' },
  { text: 'Phúc reviewed 4 fields', time: '1 h ago' },
];

/** Team Workspace — matches Figma 51:5 (Team workspace / Light) */
export function TeamScreen({ onNotify }: { onNotify: (title: string, detail: string) => void }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="fapp-section-title" style={{ margin: 0 }}>CS300 workspace</div>
          <span className="fapp-chip fapp-chip-gray">12 members</span>
        </div>
        <button
          type="button"
          className="fapp-btn fapp-btn-primary"
          onClick={() => onNotify('Đã gửi lời mời', 'Lời mời tham gia CS300 workspace đã được gửi.')}
        >
          + Invite member
        </button>
      </div>

      <div className="fapp-overview-grid">
        <div className="fapp-card">
          <div className="fapp-section-title" style={{ marginBottom: 16 }}>Members</div>
          <div className="fapp-row-list">
            {MEMBERS.map((m) => (
              <div key={m.name} className="fapp-row-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="fapp-avatar" style={{ borderRadius: '50%' }}>{m.initial}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{m.name}</div>
                    <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{m.role}</div>
                  </div>
                </div>
                <span className={`fapp-chip ${m.chip}`}>{m.state}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fapp-card">
          <div className="fapp-section-title" style={{ marginBottom: 16 }}>Recent activity</div>
          <div className="fapp-row-list">
            {ACTIVITIES.map((a) => (
              <div key={a.text} className="fapp-row-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#111827' }}>{a.text}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
