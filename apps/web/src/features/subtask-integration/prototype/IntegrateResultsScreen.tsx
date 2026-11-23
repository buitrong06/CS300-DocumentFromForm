import React, { useState } from 'react';
import type { FormValues } from '../../document-filling';
import type { ProvenanceLog } from '../model';
import type { PrototypeScreenId } from '../../../prototype/navigation';
import { INITIAL_PROVENANCE_LOGS } from '../../../prototype/scenario';

interface IntegrateResultsScreenProps {
  values: FormValues;
  onChangeValues: (updater: (prev: FormValues) => FormValues) => void;
  onNavigate: (screen: PrototypeScreenId) => void;
}

export const IntegrateResultsScreen: React.FC<IntegrateResultsScreenProps> = ({
  values,
  onChangeValues,
  onNavigate,
}) => {
  const [showUnapproved, setShowUnapproved] = useState<boolean>(true);
  const [logs, setLogs] = useState<ProvenanceLog[]>(INITIAL_PROVENANCE_LOGS);

  // Overwrite modal state
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    fieldName: string;
    fieldKey: keyof FormValues;
    currentValue: string | number;
    newValue: string | number;
    sourceName: string;
    submissionCode: string;
  } | null>(null);

  // Manual editing state for draft fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string>('');

  const handleApplyWithoutOverwriteCheck = (
    fieldKey: keyof FormValues,
    value: string | number,
    sourceName: string,
    submissionCode: string
  ) => {
    onChangeValues((prev) => ({ ...prev, [fieldKey]: value }));
    const newLog: ProvenanceLog = {
      id: 'p_' + Date.now(),
      text: `Bạn áp dụng "${fieldKey === 'programSchedule' ? 'Nội dung chương trình' : 'Tổng kinh phí'}" từ bài nộp của ${sourceName}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay',
      code: submissionCode,
      type: 'apply',
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleApplyClick = (
    fieldName: string,
    fieldKey: keyof FormValues,
    newValue: string | number,
    sourceName: string,
    submissionCode: string
  ) => {
    const currentVal = values[fieldKey];
    // Check if overwriting non-empty existing content
    if (currentVal && String(currentVal) !== '0') {
      setPendingOverwrite({
        fieldName,
        fieldKey,
        currentValue: currentVal,
        newValue,
        sourceName,
        submissionCode,
      });
    } else {
      handleApplyWithoutOverwriteCheck(fieldKey, newValue, sourceName, submissionCode);
    }
  };

  const confirmOverwrite = () => {
    if (!pendingOverwrite) return;
    const { fieldKey, newValue, sourceName, submissionCode } = pendingOverwrite;
    handleApplyWithoutOverwriteCheck(fieldKey, newValue, sourceName, submissionCode);
    setPendingOverwrite(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã chép nội dung vào khay nhớ tạm.');
  };

  return (
    <div>
      {/* Sub-header */}
      <div className="sub-header">
        <div className="sub-header-left">
          <div className="breadcrumb">Công việc / Tờ trình xin kinh phí Ngày hội Tân sinh viên</div>
          <div className="page-title">Tổng hợp kết quả vào bản nháp của bạn</div>
        </div>

        <div className="sub-header-right">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showUnapproved}
              onChange={(e) => setShowUnapproved(e.target.checked)}
            />
            Hiện cả bài chưa duyệt
          </label>

          <button className="btn btn-secondary" onClick={() => onNavigate('screen2')}>
            Mở bản nháp đầy đủ
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', fontSize: '12.5px', color: '#475569' }}>
        <strong>2</strong> lần giao việc · <strong>3</strong> người nhận · <strong>3</strong> bài đã duyệt ·{' '}
        <em>Kết quả chỉ để tham khảo: bạn chọn, kết hợp hoặc tự viết lại. Hệ thống không tự gộp.</em>
      </div>

      <div className="screen-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
          {/* Left Table / Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 240px 1fr',
                gap: '16px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                padding: '0 12px',
              }}
            >
              <div>TRƯỜNG</div>
              <div>BẢN NHÁP CỦA BẠN</div>
              <div>KẾT QUẢ ĐÃ NỘP</div>
            </div>

            {/* Row 1: Nội dung chương trình */}
            <div className="form-card" style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 240px 1fr', gap: '16px', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Nội dung chương trình</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    Giao việc #1 và #2 · 3 người
                  </div>
                </div>

                {/* Draft Column */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', fontSize: '12.5px' }}>
                  {editingField === 'programSchedule' ? (
                    <div>
                      <textarea
                        className="form-input"
                        rows={5}
                        value={tempEditValue}
                        onChange={(e) => setTempEditValue(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            onChangeValues((p) => ({ ...p, programSchedule: tempEditValue }));
                            setEditingField(null);
                          }}
                        >
                          Lưu
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingField(null)}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color: values.programSchedule ? '#0f172a' : '#94a3b8', fontStyle: values.programSchedule ? 'normal' : 'italic', whiteSpace: 'pre-line' }}>
                        {values.programSchedule || 'Chưa có nội dung'}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ border: 'none', color: '#2563eb', padding: '0', fontSize: '12px' }}
                          onClick={() => {
                            setEditingField('programSchedule');
                            setTempEditValue(values.programSchedule);
                          }}
                        >
                          ✎ Tự viết
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submissions Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Warning banner */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#92400e' }}>
                    ⚠ Hai kết quả đã duyệt khác nhau cho cùng một trường (bài của Ngô Quang đang chờ duyệt). Chọn một bản, hoặc tự kết hợp ở cột bên trái.
                  </div>

                  {/* Results cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Submission 1: Lê Văn Uy */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', background: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Lê Văn Uy</strong>
                        <span className="badge badge-green">Đã duyệt · lần 2</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', margin: '8px 0', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                        • 8h00: Khai mạc, giới thiệu Khoa và Đoàn – Hội.{'\n'}
                        • 9h00: Gian hàng CLB, trò chơi tập thể.{'\n'}
                        • 10h30: Giao lưu cựu sinh viên; bế mạc 11h30.
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            handleApplyClick(
                              'Nội dung chương trình',
                              'programSchedule',
                              `• 8h00: Khai mạc, giới thiệu Khoa và Đoàn – Hội.\n• 9h00: Gian hàng CLB, trò chơi tập thể.\n• 10h30: Giao lưu cựu sinh viên; bế mạc 11h30.`,
                              'Lê Văn Uy',
                              'SUB-2026-0412'
                            )
                          }
                        >
                          Áp dụng vào trường
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            copyToClipboard(
                              `• 8h00: Khai mạc, giới thiệu Khoa và Đoàn – Hội.\n• 9h00: Gian hàng CLB, trò chơi tập thể.\n• 10h30: Giao lưu cựu sinh viên; bế mạc 11h30.`
                            )
                          }
                        >
                          Chép đoạn
                        </button>
                      </div>
                    </div>

                    {/* Submission 2: Phạm Thị Vy */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', background: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Phạm Thị Vy</strong>
                        <span className="badge badge-green">Đã duyệt · lần 1</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', margin: '8px 0', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                        • 7h30: Đón tân sinh viên, check-in.{'\n'}
                        • 8h00: Khai mạc, văn nghệ chào mừng.{'\n'}
                        • 9h30: Hội trại các câu lạc bộ.
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            handleApplyClick(
                              'Nội dung chương trình',
                              'programSchedule',
                              `• 7h30: Đón tân sinh viên, check-in.\n• 8h00: Khai mạc, văn nghệ chào mừng.\n• 9h30: Hội trại các câu lạc bộ.`,
                              'Phạm Thị Vy',
                              'SUB-2026-0419'
                            )
                          }
                        >
                          Áp dụng vào trường
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            copyToClipboard(
                              `• 7h30: Đón tân sinh viên, check-in.\n• 8h00: Khai mạc, văn nghệ chào mừng.\n• 9h30: Hội trại các câu lạc bộ.`
                            )
                          }
                        >
                          Chép đoạn
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Dự trù kinh phí chi tiết */}
            <div className="form-card" style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 240px 1fr', gap: '16px', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Dự trù kinh phí chi tiết</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    Giao việc #2 · 2 người
                  </div>
                </div>

                {/* Draft Column */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', fontSize: '12.5px' }}>
                  <div style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                    Âm thanh, ánh sáng: 1.500.000đ{'\n'}
                    Trang trí, backdrop: 900.000đ{'\n'}
                    Nước uống, quà tặng: 800.000đ
                  </div>
                  <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '8px' }}>
                    ↳ Áp dụng từ bài nộp lần 1 của Phạm Thị Vy · 23:10 hôm nay
                  </div>
                </div>

                {/* Submissions Column */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Phạm Thị Vy */}
                  <div style={{ border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px', background: '#f0fdf4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Phạm Thị Vy</strong>
                      <span className="badge badge-green">Đã duyệt · lần 1</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', margin: '6px 0' }}>
                      3 hạng mục · tổng 3.200.000đ
                    </div>
                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                      ✓ Đang dùng
                    </div>
                  </div>

                  {/* Ngô Quang (chưa duyệt) */}
                  {showUnapproved && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', background: '#f8fafc', opacity: 0.85 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Ngô Quang</strong>
                        <span className="badge badge-orange">Chờ duyệt · lần 1</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', margin: '6px 0' }}>
                        4 hạng mục · tổng 4.100.000đ
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('screen5')}>
                        Đi tới duyệt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Tổng kinh phí */}
            <div className="form-card" style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 240px 1fr', gap: '16px', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Tổng kinh phí</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    Giao việc #2 · 2 người
                  </div>
                </div>

                {/* Draft Column */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', fontSize: '12.5px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>
                    {values.totalBudget > 0 ? `${values.totalBudget.toLocaleString('vi-VN')} VNĐ` : '3.500.000 VNĐ'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                    Bạn tự nhập · 23:15
                  </div>
                </div>

                {/* Submissions Column */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Phạm Thị Vy */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Phạm Thị Vy</strong>
                      <span className="badge badge-green">Đã duyệt · lần 1</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, margin: '6px 0' }}>
                      3.200.000 VNĐ
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        handleApplyClick(
                          'Tổng kinh phí',
                          'totalBudget',
                          3200000,
                          'Phạm Thị Vy',
                          'SUB-2026-0420'
                        )
                      }
                    >
                      Áp dụng vào trường
                    </button>
                  </div>

                  {/* Ngô Quang */}
                  {showUnapproved && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', background: '#f8fafc', opacity: 0.85 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Ngô Quang</strong>
                        <span className="badge badge-orange">Chờ duyệt · lần 1</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, margin: '6px 0' }}>
                        4.100.000 VNĐ
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Provenance History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 700 }}>Lịch sử tổng hợp</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '10px' }}>
                Ghi lại nguồn của mỗi lần áp dụng.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{log.text}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                      {log.time} {log.code ? `· ${log.code}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Final Deliverable Call to Action */}
            <div className="form-card" style={{ padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '12px', color: '#1e40af', lineHeight: 1.4, marginBottom: '12px' }}>
                Công việc gốc không tự nộp khi các phần việc đã được duyệt. Khi bản nháp hoàn chỉnh, bạn nộp cho BCH Đoàn khoa.
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  alert('Đang chuẩn bị gửi tờ trình hoàn thiện lên BCH Đoàn khoa...');
                  onNavigate('screen2');
                }}
              >
                Kiểm tra &amp; nộp lên BCH Đoàn khoa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Ghi đè nội dung hiện có? */}
      {pendingOverwrite && (
        <div className="modal-overlay" onClick={() => setPendingOverwrite(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Ghi đè nội dung hiện có?</div>
            <div className="modal-body">
              Trường &quot;{pendingOverwrite.fieldName}&quot; đang là{' '}
              <strong>
                {typeof pendingOverwrite.currentValue === 'number'
                  ? `${pendingOverwrite.currentValue.toLocaleString('vi-VN')} VNĐ`
                  : pendingOverwrite.currentValue}{' '}
                (bạn tự nhập)
              </strong>
              . Giá trị cũ vẫn xem lại được trong lịch sử.
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPendingOverwrite(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={confirmOverwrite}>
                Ghi đè
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
