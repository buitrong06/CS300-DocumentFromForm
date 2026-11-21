import React, { useState } from 'react';
import type { TemplateFieldConfig, FieldType, ScreenId } from '../types';
import { INITIAL_TEMPLATE_FIELDS } from '../mockData';

interface Screen1Props {
  onNavigate: (screen: ScreenId) => void;
}

export const Screen1FieldConfig: React.FC<Screen1Props> = ({ onNavigate }) => {
  const [fields, setFields] = useState<TemplateFieldConfig[]>(INITIAL_TEMPLATE_FIELDS);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('f9');
  const [ambiguousResolved, setAmbiguousResolved] = useState(false);
  const [savedTime, setSavedTime] = useState('');

  const update = (id: string, patch: Partial<TemplateFieldConfig>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setSavedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
  };

  const addField = () => {
    const f: TemplateFieldConfig = {
      id: 'f_' + Date.now(),
      key: 'custom_' + Date.now(),
      label: 'Trường mới',
      type: 'short_text',
      required: true,
      positionsCount: 1,
      instructions: '',
      sourceNote: 'Thêm thủ công',
    };
    setFields((prev) => [...prev, f]);
    setSelectedFieldId(f.id);
  };

  const typeLabel = (t: FieldType) =>
    ({ short_text: 'Văn bản ngắn', long_text: 'Văn bản dài', date: 'Ngày', number: 'Số', money: 'Số tiền', choice: 'Lựa chọn' }[t]);

  return (
    <div>
      {/* Top bar */}
      <div className="topbar">
        <div>
          <div className="topbar-breadcrumb">Thư viện mẫu / Tạo mẫu mới</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="topbar-title">Đơn xin nghỉ học</div>
            <div className="wizard-stepper">
              <div className="step-item completed"><span className="step-badge">✓</span> Nguồn mẫu</div>
              <div className="step-divider" />
              <div className="step-item active"><span className="step-badge">2</span> Cấu hình trường</div>
              <div className="step-divider" />
              <div className="step-item"><span className="step-badge">3</span> Checklist</div>
              <div className="step-divider" />
              <div className="step-item"><span className="step-badge">4</span> Chạy thử &amp; lưu</div>
            </div>
          </div>
        </div>
        <div className="topbar-right">
          <span style={{ fontSize: 11.5, color: '#16a34a' }}>
            {savedTime ? `✓ Đã lưu lúc ${savedTime}` : '✓ Thay đổi lưu tự động'}
          </span>
          <button className="btn btn-secondary">Lưu nháp</button>
          <button className="btn btn-primary" onClick={() => onNavigate('screen2')}>
            Tiếp tục: Checklist →
          </button>
        </div>
      </div>

      {/* Main 4-panel layout */}
      <div className="screen-container">
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 310px 380px', gap: 14, alignItems: 'start' }}>

          {/* Tool palette */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '+', label: 'Đánh dấu trường', action: addField },
              { icon: '🔓', label: 'Mở khóa đoạn chữ', action: () => alert('Chọn vùng văn bản để mở khóa.') },
              { icon: '🔗', label: 'Gán thêm vị trí', action: () => alert('Chọn vị trí trên tài liệu.') },
            ].map((t) => (
              <button
                key={t.label}
                className="btn btn-secondary"
                style={{ flexDirection: 'column', height: 64, padding: '6px 4px', fontSize: 11, textAlign: 'center', gap: 4 }}
                onClick={t.action}
                title={t.label}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Document paper */}
          <div className="paper-sheet" style={{ minHeight: 640 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, textDecoration: 'underline' }}>Độc lập - Tự do - Hạnh phúc</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 14 }}>ĐƠN XIN NGHỈ HỌC</div>
            </div>

            {(
              [
                { label: 'Kính gửi: Ban Chủ nhiệm Khoa', chip: { id: 'f1', text: 'Khoa' } },
              ]
            ).map(() => null)}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13 }}>
              <div>
                Kính gửi: Ban Chủ nhiệm Khoa{' '}
                <Chip id="f1" label="Khoa" sel={selectedFieldId} onSel={setSelectedFieldId} />
              </div>
              <div>
                Em tên là:{' '}
                <Chip id="f2" label="Họ và tên" sel={selectedFieldId} onSel={setSelectedFieldId} />{' '}
                Ngày sinh:{' '}
                <Chip id="f3" label="Ngày sinh" sel={selectedFieldId} onSel={setSelectedFieldId} />
              </div>
              <div>
                Mã số sinh viên:{' '}
                <Chip id="f4" label="MSSV" sel={selectedFieldId} onSel={setSelectedFieldId} />{' '}
                Lớp:{' '}
                <Chip id="f5" label="Lớp" sel={selectedFieldId} onSel={setSelectedFieldId} />
              </div>
              <div>
                Số điện thoại:{' '}
                <Chip id="f6" label="Số điện thoại" sel={selectedFieldId} onSel={setSelectedFieldId} />
              </div>
              <div>
                Nay em kính xin nghỉ từ ngày{' '}
                <Chip id="f7" label="Nghỉ từ ngày" sel={selectedFieldId} onSel={setSelectedFieldId} />{' '}
                đến ngày{' '}
                <Chip id="f8" label="Đến ngày" sel={selectedFieldId} onSel={setSelectedFieldId} />
              </div>
              <div>
                Lý do:{' '}
                <Chip id="f9" label="Lý do" sel={selectedFieldId} onSel={setSelectedFieldId} />
              </div>
              <p style={{ textIndent: '1cm', lineHeight: 1.5, marginTop: 6 }}>
                Em xin cam kết hoàn thành các học phần còn nợ và chịu trách nhiệm về việc học tập trong thời gian nghỉ theo quy định của Nhà trường.
              </p>
              <div style={{ textAlign: 'right', marginTop: 14 }}>
                {!ambiguousResolved
                  ? (
                    <div>
                      TP. Hồ Chí Minh, ngày <span className="doc-chip-ambiguous">ngày</span> tháng{' '}
                      <span className="doc-chip-ambiguous">tháng</span> năm{' '}
                      <span className="doc-chip-ambiguous">năm</span>
                    </div>
                  )
                  : (
                    <div>
                      TP. Hồ Chí Minh,{' '}
                      <Chip id="f_date_application" label="Ngày làm đơn" sel={selectedFieldId} onSel={setSelectedFieldId} />
                    </div>
                  )}
                <div style={{ fontWeight: 700, marginTop: 8 }}>Người làm đơn</div>
                <div style={{ fontStyle: 'italic', fontSize: 12 }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: 36 }} />
                <Chip id="f2" label="Họ và tên" sel={selectedFieldId} onSel={setSelectedFieldId} />
              </div>
            </div>
          </div>

          {/* Detection summary */}
          <div className="form-card" style={{ padding: 14, gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
              Kết quả nhận diện
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5 }}>
              <Row label='Từ dòng chấm "......"' val="13" />
              <Row label="Từ {{ }} / comment" val="0" />
              <Row label="Cần xác nhận" val={ambiguousResolved ? '0' : '3'} valColor={ambiguousResolved ? '#16a34a' : '#d97706'} />
            </div>

            {/* Legend */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="doc-chip-blue" style={{ fontSize: 11, padding: '1px 4px' }}>Tên trường</span>
                <span style={{ color: '#64748b' }}>Trường cần điền</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="doc-chip-ambiguous" style={{ fontSize: 11, padding: '1px 3px' }}>ngày</span>
                <span style={{ color: '#64748b' }}>Chỗ trống chưa rõ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="doc-chip-blue doc-chip-selected" style={{ fontSize: 11, padding: '1px 4px' }}>Lý do</span>
                <span style={{ color: '#64748b' }}>Đang chọn</span>
              </div>
              <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                Chữ thường = đã khóa, người điền không sửa được
              </div>
            </div>

            {/* Ambiguous merge card */}
            {!ambiguousResolved && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: 10, marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                  3 chỗ trống liền nhau trông giống một ngày tháng
                </div>
                <div style={{ fontSize: 11.5, color: '#78350f', margin: '4px 0 8px' }}>
                  "ngày … tháng … năm …" — gộp thành trường kiểu <strong>Ngày</strong>?
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setAmbiguousResolved(true)}>
                    Gộp thành "Ngày làm đơn"
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setAmbiguousResolved(true)}>
                    Giữ 3 trường riêng
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Field list + editor */}
          <div className="form-card" style={{ padding: 16, gap: 10, maxHeight: 760, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                  Trường của biểu mẫu ({fields.length}{!ambiguousResolved ? ' · 3 chờ xác nhận' : ''})
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Nhãn lấy từ chữ đứng trước chỗ trống; kiểu được đoán từ nhãn.
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={addField}>+ Thêm trường</button>
            </div>

            {fields.map((f, i) => {
              const isSel = f.id === selectedFieldId;
              return (
                <div
                  key={f.id}
                  style={{
                    border: isSel ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                    borderRadius: 6,
                    background: isSel ? '#f0f7ff' : 'white',
                    overflow: 'hidden',
                    transition: 'all 0.14s',
                  }}
                >
                  <div
                    style={{ padding: '9px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => setSelectedFieldId(f.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: '#94a3b8', width: 16 }}>{i + 1}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                        {f.positionsCount > 1 && (
                          <div style={{ fontSize: 11, color: '#64748b' }}>{f.positionsCount} vị trí trong văn bản</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span className="badge badge-blue">{typeLabel(f.type)}</span>
                      <span className={`badge ${f.required ? 'badge-red' : 'badge-gray'}`}>
                        {f.required ? 'Bắt buộc' : 'Tùy chọn'}
                      </span>
                    </div>
                  </div>

                  {isSel && (
                    <div style={{ padding: '10px 12px', borderTop: '1px solid #dbeafe', background: 'white', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 12 }}>Nhãn</label>
                          <input className="form-input" value={f.label} onChange={(e) => update(f.id, { label: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 12 }}>Kiểu trường</label>
                          <select className="form-input" value={f.type} onChange={(e) => update(f.id, { type: e.target.value as FieldType })}>
                            <option value="short_text">Văn bản ngắn</option>
                            <option value="long_text">Văn bản dài</option>
                            <option value="date">Ngày</option>
                            <option value="number">Số</option>
                            <option value="money">Số tiền</option>
                            <option value="choice">Lựa chọn</option>
                          </select>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{f.sourceNote || 'Tự đoán từ nhãn · đổi được'}</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 12 }}>Hướng dẫn cho người điền</label>
                        <textarea
                          className="form-input"
                          style={{ minHeight: 56, resize: 'vertical' }}
                          value={f.instructions}
                          onChange={(e) => update(f.id, { instructions: e.target.value })}
                        />
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          Hướng dẫn hiển thị cạnh ô nhập và được dùng để tạo checklist ở bước 3.
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                          <input type="checkbox" checked={f.required} onChange={(e) => update(f.id, { required: e.target.checked })} />
                          Bắt buộc
                        </label>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12, alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Vị trí: {f.positionsCount}</span>
                          <button className="btn btn-outline-danger btn-xs" onClick={() => {
                            setFields((p) => p.filter((x) => x.id !== f.id));
                            setSelectedFieldId(fields[0]?.id ?? '');
                          }}>
                            Xóa trường
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ fontSize: 11.5, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
              {savedTime ? `✓ Đã lưu lúc ${savedTime}` : '✓ Thay đổi được lưu tự động vào bản nháp của mẫu'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function Chip({ id, label, sel, onSel }: { id: string; label: string; sel: string; onSel: (id: string) => void }) {
  return (
    <span
      className={`doc-chip-blue${sel === id ? ' doc-chip-selected' : ''}`}
      onClick={() => onSel(id)}
      role="button"
      tabIndex={0}
    >
      {label}
    </span>
  );
}

function Row({ label, val, valColor }: { label: string; val: string; valColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <strong style={{ color: valColor }}>{val}</strong>
    </div>
  );
}
