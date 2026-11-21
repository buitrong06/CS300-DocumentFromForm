import React, { useState } from 'react';
import type { ScreenId } from '../types';

interface Screen4Props {
  onNavigate: (screen: ScreenId) => void;
}

interface FormFieldItem {
  key: string;
  label: string;
  description?: string;
  isDelegatedEarlier?: boolean;
}

export const Screen4AssignWork: React.FC<Screen4Props> = ({ onNavigate }) => {
  const allFields: FormFieldItem[] = [
    { key: 'unit', label: 'Đơn vị' },
    { key: 'createDate', label: 'Ngày lập' },
    { key: 'activityName', label: 'Tên hoạt động' },
    { key: 'eventDate', label: 'Thời gian tổ chức' },
    { key: 'location', label: 'Địa điểm' },
    { key: 'purpose', label: 'Mục đích' },
    {
      key: 'programSchedule',
      label: 'Nội dung chương trình',
      description: 'Liệt kê các hoạt động chính theo trình tự thời gian.',
      isDelegatedEarlier: true,
    },
    {
      key: 'budgetDetail',
      label: 'Dự trù kinh phí chi tiết',
      description: 'Bảng các khoản chi: hạng mục, số lượng, đơn giá, thành tiền.',
    },
    {
      key: 'totalBudget',
      label: 'Tổng kinh phí',
      description: 'Khớp với tổng của dự trù chi tiết.',
    },
    { key: 'signatory', label: 'Người ký' },
  ];

  const [selectedKeys, setSelectedKeys] = useState<string[]>([
    'programSchedule',
    'budgetDetail',
    'totalBudget',
  ]);

  const [title, setTitle] = useState('Dự trù kinh phí và chương trình NHTSV');
  const [recipients, setRecipients] = useState([
    { id: 'pv', name: 'Phạm Thị Vy', avatar: 'PV' },
    { id: 'nq', name: 'Ngô Quang', avatar: 'NQ' },
  ]);
  const [deadline, setDeadline] = useState('2026-11-06');
  const [instructions, setInstructions] = useState(
    'Dự trù theo đơn giá năm ngoái (file đính kèm trong thảo luận). Chương trình tối đa 4 tiếng.'
  );
  const [readOnlyContext, setReadOnlyContext] = useState([
    'Tên hoạt động',
    'Thời gian tổ chức',
    'Địa điểm',
  ]);

  const toggleField = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (selectedKeys.length === allFields.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(allFields.map((f) => f.key));
    }
  };

  const removeRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const addRecipient = () => {
    const name = prompt('Nhập tên thành viên (ví dụ: Lê Thảo Nhi):');
    if (name) {
      const initials = name
        .split(' ')
        .slice(-2)
        .map((p) => p[0].toUpperCase())
        .join('');
      setRecipients((prev) => [...prev, { id: 'user_' + Date.now(), name, avatar: initials }]);
    }
  };

  const handleAssign = () => {
    if (selectedKeys.length === 0) {
      alert('Vui lòng chọn ít nhất một trường để giao việc.');
      return;
    }
    if (recipients.length === 0) {
      alert('Vui lòng chọn ít nhất một người nhận.');
      return;
    }
    alert(
      `Đã giao việc thành công!\n- Tiêu đề: ${title}\n- Người nhận: ${recipients
        .map((r) => r.name)
        .join(', ')}\n- Số trường: ${selectedKeys.length}`
    );
    onNavigate('screen5');
  };

  return (
    <div>
      {/* Sub-header */}
      <div className="sub-header">
        <div className="sub-header-left">
          <div className="breadcrumb">Công việc / Tờ trình xin kinh phí Ngày hội Tân sinh viên</div>
          <div className="page-title">Giao việc từ công việc này</div>
        </div>

        <div className="sub-header-right">
          <button className="btn btn-secondary" onClick={() => onNavigate('screen2')}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={handleAssign}>
            Giao việc
          </button>
        </div>
      </div>

      <div className="screen-container">
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left Column: Select Fields */}
          <div className="form-card">
            {/* Banner */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '12px', fontSize: '12.5px', color: '#1e40af' }}>
              Bạn đang phụ trách công việc này (giao bởi <strong>BCH Đoàn khoa</strong>, hạn <strong>05/11/2026</strong>). Chọn các trường muốn nhờ người khác làm. Bạn vẫn là người tổng hợp và nộp bản cuối.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700 }}>
                Trường của biểu mẫu · đã chọn {selectedKeys.length}/{allFields.length}
              </div>
              <button
                className="btn btn-sm btn-secondary"
                style={{ border: 'none', color: '#2563eb' }}
                onClick={handleSelectAll}
              >
                {selectedKeys.length === allFields.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            {/* Checkbox list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allFields.map((field) => {
                const isSelected = selectedKeys.includes(field.key);
                return (
                  <div
                    key={field.key}
                    style={{
                      border: isSelected ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      background: isSelected ? '#f8fbff' : 'white',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleField(field.key)}
                        style={{ marginTop: '3px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: isSelected ? 600 : 500 }}>
                            {field.label}
                          </span>
                          {field.isDelegatedEarlier && (
                            <span className="badge badge-gray">Đã giao: #1</span>
                          )}
                        </div>

                        {field.description && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {field.description}
                          </div>
                        )}

                        {field.key === 'programSchedule' && isSelected && (
                          <div
                            style={{
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              borderRadius: '4px',
                              padding: '6px 8px',
                              marginTop: '6px',
                              fontSize: '11.5px',
                              color: '#92400e',
                            }}
                          >
                            ⚠ Trường này đã giao cho <strong>Lê Văn Uy</strong> (Giao việc #1). Vẫn có thể giao thêm; mỗi người nộp bản riêng để bạn so sánh.
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Assignment Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-card">
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Thông tin giao việc</div>

              <div className="form-group">
                <label className="form-label">Tiêu đề</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Người nhận</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {recipients.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f1f5f9',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12.5px',
                        fontWeight: 500,
                      }}
                    >
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#3b82f6',
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}
                      >
                        {rec.avatar}
                      </span>
                      <span>{rec.name}</span>
                      <button
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', lineHeight: 1 }}
                        onClick={() => removeRecipient(rec.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: '20px', fontSize: '12px' }}
                    onClick={addRecipient}
                  >
                    + Thêm thành viên Chi đoàn 23CTT1
                  </button>
                </div>
                <span className="form-help">
                  Mỗi người nhận có bản nháp và lần nộp riêng; không ai thấy bài của người khác.
                </span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hạn chót</label>
                  <input
                    type="date"
                    className="form-input"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                  {deadline > '2026-11-05' && (
                    <span style={{ fontSize: '11.5px', color: '#d97706', fontWeight: 500 }}>
                      ⚠ Muộn hơn hạn của công việc gốc (05/11/2026).
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Ngữ cảnh cho xem (chỉ đọc)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {readOnlyContext.map((ctx) => (
                      <span
                        key={ctx}
                        style={{
                          border: '1px dashed #94a3b8',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#475569',
                          background: '#f8fafc',
                        }}
                      >
                        {ctx}
                      </span>
                    ))}
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ borderRadius: '12px', padding: '2px 8px' }}
                      onClick={() => {
                        const extra = prompt('Thêm trường ngữ cảnh chỉ đọc:');
                        if (extra) setReadOnlyContext((p) => [...p, extra]);
                      }}
                    >
                      +
                    </button>
                  </div>
                  <span className="form-help">
                    Người nhận thấy các trường này nhưng không sửa được.
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hướng dẫn thêm</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '60px', resize: 'vertical' }}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              {/* Summary box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  fontSize: '13px',
                }}
              >
                <div>
                  Sẽ giao <strong>{selectedKeys.length} trường</strong> cho{' '}
                  <strong>{recipients.length} người</strong> &rarr; tạo{' '}
                  <strong>{recipients.length} bản nháp riêng</strong>.
                </div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                  Bản nháp của bạn và công việc gốc không thay đổi.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => onNavigate('screen2')}>
                  Hủy
                </button>
                <button className="btn btn-primary" onClick={handleAssign}>
                  Giao việc
                </button>
              </div>
            </div>

            {/* Bottom Section: Previous subtasks */}
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '8px' }}>
                Đã giao từ công việc này
              </div>
              <div
                className="form-card"
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexDirection: 'row',
                }}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600 }}>
                    #1 · Nội dung chương trình · Lê Văn Uy
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Hạn 03/11 · Đã nộp lần 2 · Chờ bạn duyệt
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('screen5')}>
                  Mở
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
