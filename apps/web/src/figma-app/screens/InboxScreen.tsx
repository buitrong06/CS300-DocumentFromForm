import { useState } from 'react';

const THREADS = [
  { id: 't1', title: 'Tờ khai thông tin cư trú', info: '4 messages' },
  { id: 't2', title: 'Đăng ký tên định danh', info: '2 messages' },
  { id: 't3', title: 'Mẫu tờ trình chung', info: 'Resolved' },
];

const INITIAL_MSGS = [
  { initial: 'M', sender: 'Mai Nguyen', time: '09:42', text: 'The label should be “Số định danh cá nhân” — keep the 12-digit rule.' },
  { initial: 'LP', sender: 'You', time: '09:49', text: 'Agreed. I added max length 12 and left the source note attached.' },
  { initial: 'H', sender: 'Huy Tran', time: '10:03', text: 'Looks good. Marking this field ready for publish.' },
];

/** Inbox / Trao đổi — matches Figma 4:74 (Trao đổi / Light) */
export function InboxScreen() {
  const [selected, setSelected] = useState('t1');
  const [reply, setReply] = useState('');
  const [msgs, setMsgs] = useState(INITIAL_MSGS);

  const send = () => {
    if (!reply.trim()) return;
    setMsgs((prev) => [...prev, { initial: 'LP', sender: 'You', time: 'Vừa xong', text: reply.trim() }]);
    setReply('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
      <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="fapp-section-title" style={{ margin: 0 }}>Inbox</div>
          <span className="fapp-chip fapp-chip-violet">3 unread</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {THREADS.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(t.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelected(t.id)}
              className={`fapp-proposal-row${selected === t.id ? ' selected' : ''}`}
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{t.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{t.info}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eef2f7', paddingBottom: 14 }}>
          <div>
            <div className="fapp-section-title">Tờ khai thông tin cư trú</div>
            <div className="fapp-section-help">Field: Số định danh cá nhân · extracted from table row 4</div>
          </div>
          <span className="fapp-chip fapp-chip-yellow">In review</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {msgs.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div className="fapp-avatar" style={{ width: 34, height: 34, borderRadius: '50%' }}>{m.initial}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span>{m.sender}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>{m.time}</span>
                </div>
                <div style={{ marginTop: 6, padding: '10px 14px', background: '#f6f7fb', borderRadius: 10, fontSize: 13.5 }}>
                  {m.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
          <input
            className="fapp-input"
            placeholder="Write a reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button type="button" className="fapp-btn fapp-btn-primary" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  );
}
