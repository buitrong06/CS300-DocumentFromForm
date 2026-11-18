import React, { useState } from 'react';
import type { ScreenId, SubmissionSnapshot } from '../types';
import { INITIAL_SUBMISSIONS } from '../mockData';

interface Screen5Props {
  onNavigate: (screen: ScreenId) => void;
}

export const Screen5ReviewSubmission: React.FC<Screen5Props> = ({ onNavigate }) => {
  const [submissions, setSubmissions] = useState<SubmissionSnapshot[]>(INITIAL_SUBMISSIONS);
  const [selectedSubId, setSelectedSubId] = useState<string>('sub-2');
  const [showDiff, setShowDiff] = useState<boolean>(true);
  const [reviewComment, setReviewComment] = useState<string>(
    'Đã bổ sung phần giao lưu, trình tự hợp lý. Tốt.'
  );
  const [showDiscussion, setShowDiscussion] = useState<boolean>(false);
  const [reviewHistory, setReviewHistory] = useState([
    {
      round: 'Lần #1',
      decision: 'Yêu cầu sửa',
      time: '27/10 10:12',
      comment: 'Thiếu phần giao lưu cựu sinh viên, sắp lại theo giờ.',
    },
  ]);

  const activeSub = submissions.find((s) => s.id === selectedSubId) || submissions[0];

  const handleApprove = () => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === selectedSubId ? { ...s, status: 'approved' } : s))
    );
    setReviewHistory((prev) => [
      {
        round: `Lần #${activeSub.submissionIndex}`,
        decision: 'Đã duyệt',
        time: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        comment: reviewComment,
      },
      ...prev,
    ]);
    alert(`Đã duyệt bài nộp ${activeSub.submissionCode} của ${activeSub.recipientName}!\nKết quả đã sẵn sàng để tổng hợp vào bản nháp gốc.`);
    onNavigate('screen6');
  };

  const handleRequestRevision = () => {
    if (!reviewComment.trim()) {
      alert('Vui lòng nhập nhận xét yêu cầu sửa.');
      return;
    }
    setSubmissions((prev) =>
      prev.map((s) => (s.id === selectedSubId ? { ...s, status: 'revision_requested' } : s))
    );
    setReviewHistory((prev) => [
      {
        round: `Lần #${activeSub.submissionIndex}`,
        decision: 'Yêu cầu sửa',
        time: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        comment: reviewComment,
      },
      ...prev,
    ]);
    alert(`Đã gửi yêu cầu sửa cho ${activeSub.recipientName}.\nBản nháp của người nhận vẫn có thể tiếp tục chỉnh sửa.`);
  };

  return (
    <div>
      {/* Sub-header */}
      <div className="sub-header">
        <div className="sub-header-left">
          <div className="breadcrumb">Công việc / Tờ trình xin kinh phí NHTSV / Giao việc #1</div>
          <div className="page-title">Duyệt bài nộp · Nội dung chương trình</div>
        </div>

        <div className="sub-header-right">
          <button className="btn btn-secondary" onClick={() => setShowDiscussion(true)}>
            Thảo luận (3)
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('screen6')}>
            Đến màn hình Tổng hợp &rarr;
          </button>
        </div>
      </div>

      <div className="screen-container">
        <div className="three-column-view">
          {/* Column 1: Submissions list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Recipient summary card */}
            <div className="form-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Người nhận
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  LU
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Lê Văn Uy</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>2 lần nộp · Chờ duyệt</div>
                </div>
              </div>
            </div>

            {/* List of Submissions */}
            <div className="form-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                CÁC LẦN NỘP CỦA LÊ VĂN UY
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {submissions.map((sub) => {
                  const isSelected = sub.id === selectedSubId;
                  return (
                    <div
                      key={sub.id}
                      style={{
                        border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'white',
                      }}
                      onClick={() => setSelectedSubId(sub.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '13px' }}>Lần nộp #{sub.submissionIndex}</strong>
                        <span
                          className={`badge ${
                            sub.status === 'approved'
                              ? 'badge-green'
                              : sub.status === 'pending'
                              ? 'badge-orange'
                              : 'badge-red'
                          }`}
                        >
                          {sub.status === 'approved'
                            ? 'Đã duyệt'
                            : sub.status === 'pending'
                            ? 'Chờ duyệt'
                            : 'Yêu cầu sửa'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                        {sub.timestamp} · {sub.versionLabel}
                      </div>

                      {sub.reviewComment && sub.status === 'revision_requested' && (
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: '#991b1b',
                            background: '#fef2f2',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            marginTop: '6px',
                            fontStyle: 'italic',
                          }}
                        >
                          &quot;{sub.reviewComment}&quot; — bạn, 27/10
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '12px', lineHeight: 1.4 }}>
                Mỗi lần nộp là một bản chụp cố định. Lê Văn Uy có thể tiếp tục sửa bản nháp; các thay đổi sau này không ảnh hưởng tới bản bạn đang duyệt.
              </div>
            </div>
          </div>

          {/* Column 2: Selected Submission Snapshot */}
          <div className="form-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: 700 }}>
                  Lần nộp #{activeSub.submissionIndex} · {activeSub.recipientName} · {activeSub.timestamp}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showDiff}
                    onChange={(e) => setShowDiff(e.target.checked)}
                  />
                  So sánh với lần #1
                </label>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => alert(`Đang xuất file snapshot ${activeSub.submissionCode}...`)}
                >
                  Xuất DOCX/PDF bản này
                </button>
              </div>
            </div>

            {/* Lock bar */}
            <div
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                color: '#334155',
                margin: '14px 0',
              }}
            >
              <span>🔒</span>
              <span>
                <strong>Bản chụp cố định</strong> · mã bản nộp <strong>{activeSub.submissionCode}</strong> · chỉ chứa các trường được giao
              </span>
            </div>

            {/* Snapshot content */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', background: '#ffffff' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                Nội dung chương trình
              </div>

              {activeSub.submissionIndex === 2 && showDiff ? (
                <div style={{ fontSize: '13.5px', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                  • 8h00: Khai mạc, giới thiệu Khoa và Đoàn – Hội.{'\n'}
                  • 9h00: Gian hàng câu lạc bộ, trò chơi tập thể.{'\n'}
                  • 10h30: Giao lưu cùng cựu sinh viên;{' '}
                  <span style={{ background: '#dcfce7', color: '#15803d', borderBottom: '2px solid #22c55e', padding: '1px 3px' }}>
                    bế mạc lúc 11h30.
                  </span>{'\n'}
                  <del style={{ color: '#dc2626', background: '#fee2e2', padding: '1px 3px' }}>
                    • 10h00: Bế mạc.
                  </del>
                </div>
              ) : (
                <div style={{ fontSize: '13.5px', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                  {activeSub.content.programSchedule}
                </div>
              )}
            </div>

            {/* Read-only Context reminder */}
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              Ngữ cảnh chỉ đọc mà người nhận được xem: <em>Tên hoạt động · Thời gian tổ chức · Địa điểm</em>
            </div>
          </div>

          {/* Column 3: Review Decision Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>
                Đánh giá lần nộp #{activeSub.submissionIndex}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Kết quả chỉ gắn với bản chụp này.
              </div>

              {/* Auto check findings summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginTop: '10px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700 }}>Kiểm tra tự động lúc nộp</div>
                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                  ✓ Luật tự động: đạt (1/1)
                </div>
                <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>
                  ⚠ Nội dung: 1 cảnh báo — &quot;Chưa ghi giờ kết thúc của hoạt động 9h00&quot;
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                  Cảnh báo của mô hình ngôn ngữ chỉ để tham khảo.
                </div>
              </div>

              {/* Review Comment Box */}
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label" style={{ fontSize: '12.5px' }}>Nhận xét</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Nhập nhận xét đánh giá..."
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={handleRequestRevision}>
                  Yêu cầu sửa
                </button>
                <button className="btn btn-success" onClick={handleApprove}>
                  ✓ Duyệt
                </button>
              </div>
            </div>

            {/* Evaluation History */}
            <div className="form-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                Lịch sử đánh giá
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reviewHistory.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <strong>{item.round} · {item.decision}</strong>
                      <span style={{ color: '#64748b' }}>{item.time}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                      &quot;{item.comment}&quot;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discussion Drawer */}
      {showDiscussion && (
        <div className="modal-overlay" onClick={() => setShowDiscussion(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="modal-title">Thảo luận công việc #1 (3 tin nhắn)</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDiscussion(false)}>
                Đóng
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px' }}>
                <strong>Lê Văn Uy:</strong> Em đã gửi bản chụp lần 2 bổ sung giờ giao lưu cựu sinh viên rồi ạ.
              </div>
              <div style={{ background: '#eff6ff', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px' }}>
                <strong>Bạn (Trần Minh Khoa):</strong> Đã nhận được, anh đang duyệt nhé.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
