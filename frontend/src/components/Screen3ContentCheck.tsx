import React, { useState } from 'react';
import type { FormValues, ScreenId, CorrectionSuggestion } from '../types';
import {
  INITIAL_RULE_FINDINGS,
  INITIAL_CORRECTION_SUGGESTIONS,
} from '../mockData';
import { DocumentPreview } from './DocumentPreview';

interface Screen3Props {
  values: FormValues;
  onChangeValues: (updater: (prev: FormValues) => FormValues) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const Screen3ContentCheck: React.FC<Screen3Props> = ({
  values,
  onChangeValues,
  onNavigate,
}) => {
  const [suggestions, setSuggestions] = useState<CorrectionSuggestion[]>(
    INITIAL_CORRECTION_SUGGESTIONS
  );
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isRechecking, setIsRechecking] = useState<boolean>(false);
  const [activeHighlightedField, setActiveHighlightedField] = useState<string | null>(null);

  // Apply a single suggestion
  const handleAcceptSuggestion = (id: string) => {
    const sugg = suggestions.find((s) => s.id === id);
    if (!sugg) return;

    if (id === 'cs-1' || id === 'cs-2') {
      // update purpose
      onChangeValues((prev) => {
        let p = prev.purpose;
        if (id === 'cs-1') {
          p = p.replace('phong trào của Khoa đồng thời', 'phong trào của Khoa, đồng thời');
        } else if (id === 'cs-2') {
          p = p.replace('đoan', 'đoàn');
        }
        return { ...prev, purpose: p };
      });
    } else if (id === 'cs-3') {
      onChangeValues((prev) => ({
        ...prev,
        programSchedule: prev.programSchedule.replace('sinh viên; bế mạc', 'sinh viên: bế mạc'),
      }));
    }

    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRejectSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAcceptAll = () => {
    onChangeValues((prev) => ({
      ...prev,
      purpose: prev.purpose
        .replace('phong trào của Khoa đồng thời', 'phong trào của Khoa, đồng thời')
        .replace('đoan', 'đoàn'),
      programSchedule: prev.programSchedule.replace('sinh viên; bế mạc', 'sinh viên: bế mạc'),
    }));
    setSuggestions([]);
  };

  const handleRecheck = () => {
    setIsRechecking(true);
    setTimeout(() => {
      setIsRechecking(false);
      alert('Đã hoàn thành kiểm tra lại. Các luật tự động và tiêu chí ngữ nghĩa đã được cập nhật.');
    }, 600);
  };

  const handleScrollToField = (fieldKey: string) => {
    setActiveHighlightedField(fieldKey);
    const el = document.getElementById(`field-${fieldKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  };

  return (
    <div>
      {/* Sub-header */}
      <div className="sub-header">
        <div className="sub-header-left">
          <div className="breadcrumb">Công việc / Đoàn khoa CNTT</div>
          <div className="page-title">Tờ trình xin kinh phí Ngày hội Tân sinh viên</div>
        </div>

        <div className="sub-header-center">
          <span>Giao bởi <strong>BCH Đoàn khoa</strong></span>
          <span>·</span>
          <span>Hạn <strong>05/11/2026</strong></span>
          <span className="badge badge-blue">Đang làm</span>
        </div>

        <div className="sub-header-right">
          <button className="btn btn-secondary" onClick={() => setShowPreviewModal(true)}>
            Hiện xem trước
          </button>
          <button className="btn btn-secondary" onClick={() => alert('Xuất file DOCX / PDF')}>
            Xuất file ▾
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('screen4')}>
            Nộp bài
          </button>
        </div>
      </div>

      <div className="screen-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px', alignItems: 'start' }}>
          {/* Left Form with Verification Badges & Tracked Changes */}
          <div className="form-card">
            <div className="form-section-title">Thông tin chung</div>

            <div className="form-row">
              <div
                className="form-group"
                id="field-activityName"
                style={{
                  gridColumn: '1 / -1',
                  padding: activeHighlightedField === 'activityName' ? '6px' : '0',
                  borderRadius: '6px',
                  background: activeHighlightedField === 'activityName' ? '#eff6ff' : 'transparent',
                }}
              >
                <div className="form-label">
                  <span>Tên hoạt động *</span>
                  <span className="badge badge-green">✓ Đạt</span>
                </div>
                <input className="form-input" value={values.activityName} readOnly />
              </div>

              <div
                className="form-group"
                id="field-eventDate"
                style={{
                  gridColumn: '1 / -1',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  padding: '10px',
                  background: '#fef2f2',
                }}
              >
                <div className="form-label">
                  <span style={{ color: '#dc2626' }}>Thời gian tổ chức *</span>
                  <span className="badge badge-red">Sai luật</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="date"
                    className="form-input error"
                    value="2026-10-15"
                    readOnly
                    style={{ maxWidth: '240px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#dc2626' }}>
                    Phải sau ngày lập (29/10/2026).
                  </span>
                </div>
              </div>
            </div>

            <div className="form-section-title" style={{ marginTop: '10px' }}>Nội dung tờ trình</div>

            {/* Purpose field with tracked changes */}
            <div
              className="form-group"
              id="field-purpose"
              style={{
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '12px',
                background: '#fffbeb',
              }}
            >
              <div className="form-label">
                <span>Mục đích *</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className="badge badge-orange">Cần bổ sung</span>
                  {suggestions.filter((s) => s.fieldKey === 'purpose').length > 0 && (
                    <span className="badge badge-blue">
                      {suggestions.filter((s) => s.fieldKey === 'purpose').length} gợi ý sửa
                    </span>
                  )}
                </div>
              </div>
              <span className="form-help">Nêu mục đích và đối tượng tham gia. Tối thiểu 2 câu.</span>

              <div
                style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '12px',
                  lineHeight: '1.7',
                  fontSize: '13.5px',
                }}
              >
                Giúp tân sinh viên làm quen với môi trường học tập và các hoạt động phong trào của Khoa
                {suggestions.some((s) => s.id === 'cs-1') ? (
                  <>
                    <ins className="tracked-ins">,</ins>
                    <span className="tracked-actions">
                      <button
                        className="tracked-btn tracked-btn-accept"
                        onClick={() => handleAcceptSuggestion('cs-1')}
                        title="Nhận dấu phẩy"
                      >
                        ✓
                      </button>
                      <button
                        className="tracked-btn tracked-btn-reject"
                        onClick={() => handleRejectSuggestion('cs-1')}
                        title="Bỏ qua"
                      >
                        ✗
                      </button>
                    </span>
                  </>
                ) : (
                  ','
                )}{' '}
                <span style={{ background: '#fef08a', padding: '1px 3px' }}>
                  đồng thời tạo cơ hội giao lưu giữa các khóa.
                </span>{' '}
                Chương trình góp phần nâng cao tinh thần{' '}
                {suggestions.some((s) => s.id === 'cs-2') ? (
                  <>
                    <del className="tracked-del">đoan</del>
                    <ins className="tracked-ins">đoàn</ins>
                    <span className="tracked-actions">
                      <button
                        className="tracked-btn tracked-btn-accept"
                        onClick={() => handleAcceptSuggestion('cs-2')}
                        title="Nhận sửa chính tả"
                      >
                        ✓
                      </button>
                      <button
                        className="tracked-btn tracked-btn-reject"
                        onClick={() => handleRejectSuggestion('cs-2')}
                        title="Bỏ qua"
                      >
                        ✗
                      </button>
                    </span>
                  </>
                ) : (
                  'đoàn'
                )}{' '}
                kết trong Khoa.
              </div>
            </div>

            {/* Program schedule field */}
            <div
              className="form-group"
              id="field-programSchedule"
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                background: 'white',
              }}
            >
              <div className="form-label">
                <span>Nội dung chương trình *</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className="badge badge-gray">Không chắc chắn</span>
                  {suggestions.filter((s) => s.fieldKey === 'programSchedule').length > 0 && (
                    <span className="badge badge-blue">1 gợi ý sửa</span>
                  )}
                </div>
              </div>
              <span className="form-help">Liệt kê các hoạt động chính theo trình tự thời gian.</span>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '12px',
                  lineHeight: '1.7',
                  fontSize: '13.5px',
                }}
              >
                <div>• 8h00: Khai mạc, giới thiệu Khoa và Đoàn – Hội.</div>
                <div>• 9h00: Gian hàng câu lạc bộ, trò chơi tập thể.</div>
                <div>
                  • 10h30: Giao lưu cùng cựu sinh viên
                  {suggestions.some((s) => s.id === 'cs-3') ? (
                    <>
                      <del className="tracked-del">;</del>
                      <ins className="tracked-ins">:</ins>
                      <span className="tracked-actions">
                        <button
                          className="tracked-btn tracked-btn-accept"
                          onClick={() => handleAcceptSuggestion('cs-3')}
                          title="Nhận dấu hai chấm"
                        >
                          ✓
                        </button>
                        <button
                          className="tracked-btn tracked-btn-reject"
                          onClick={() => handleRejectSuggestion('cs-3')}
                          title="Bỏ qua"
                        >
                          ✗
                        </button>
                      </span>
                    </>
                  ) : (
                    ':'
                  )}{' '}
                  bế mạc.
                </div>
              </div>
            </div>

            {/* Total Budget & Signatory */}
            <div className="form-row">
              <div
                className="form-group"
                id="field-totalBudget"
                style={{
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  padding: '10px',
                  background: '#fef2f2',
                }}
              >
                <div className="form-label">
                  <span style={{ color: '#dc2626' }}>Tổng kinh phí *</span>
                  <span className="badge badge-red">Thiếu</span>
                </div>
                <div className="form-input-addon">
                  <input className="form-input error" value="0" readOnly />
                  <span className="input-suffix">VNĐ</span>
                </div>
              </div>

              <div className="form-group" id="field-signatory">
                <div className="form-label">
                  <span>Người ký *</span>
                  <span className="badge badge-green">✓ Đạt</span>
                </div>
                <input className="form-input" value="Trần Minh Khoa" readOnly />
              </div>
            </div>
          </div>

          {/* Right Panel: Content Check Findings & Suggestions */}
          <div className="form-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Kiểm tra nội dung</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Lần kiểm tra lúc 23:52 · nội dung của bạn không bị thay đổi
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleRecheck}
                disabled={isRechecking}
              >
                {isRechecking ? 'Đang kiểm tra...' : '↻ Kiểm tra lại'}
              </button>
            </div>

            {/* 4 Stat Cards */}
            <div className="stat-grid-4" style={{ marginTop: '4px' }}>
              <div className="stat-card" style={{ borderTop: '3px solid #dc2626' }}>
                <div className="stat-number" style={{ color: '#dc2626' }}>2</div>
                <div className="stat-label">Sai luật tự động</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #d97706' }}>
                <div className="stat-number" style={{ color: '#d97706' }}>1</div>
                <div className="stat-label">Cần bổ sung</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #64748b' }}>
                <div className="stat-number" style={{ color: '#64748b' }}>1</div>
                <div className="stat-label">Không chắc chắn</div>
              </div>
              <div className="stat-card" style={{ borderTop: '3px solid #16a34a' }}>
                <div className="stat-number" style={{ color: '#16a34a' }}>7</div>
                <div className="stat-label">Đạt</div>
              </div>
            </div>

            {/* Findings List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Kết quả kiểm tra (4)</div>

              {INITIAL_RULE_FINDINGS.map((finding) => (
                <div
                  key={finding.id}
                  className={`finding-card ${
                    finding.type === 'rule'
                      ? 'danger'
                      : finding.type === 'semantic'
                      ? 'warning'
                      : 'gray'
                  }`}
                >
                  <div className="finding-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className={`badge ${
                          finding.type === 'rule'
                            ? 'badge-red'
                            : finding.type === 'semantic'
                            ? 'badge-orange'
                            : 'badge-gray'
                        }`}
                      >
                        {finding.type === 'rule'
                          ? 'Luật'
                          : finding.type === 'semantic'
                          ? 'Nội dung'
                          : 'Không chắc chắn'}
                      </span>
                      <strong>{finding.fieldName}</strong>
                    </div>
                    <button
                      className="btn btn-sm"
                      style={{ border: 'none', background: 'transparent', color: '#2563eb', padding: '0', fontSize: '12px' }}
                      onClick={() => handleScrollToField(String(finding.fieldKey))}
                    >
                      Đến trường &rarr;
                    </button>
                  </div>

                  <div style={{ fontSize: '12.5px', color: '#334155' }}>{finding.message}</div>

                  {finding.evidence && (
                    <div className="finding-evidence">{finding.evidence}</div>
                  )}

                  {finding.criterion && (
                    <div className="finding-criterion">{finding.criterion}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Suggestions List */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>
                    Gợi ý sửa lỗi nhỏ ({suggestions.length})
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    hiện dạng theo dõi thay đổi trong form
                  </div>
                </div>
                {suggestions.length > 0 && (
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ color: '#2563eb', fontSize: '12px' }}
                    onClick={handleAcceptAll}
                  >
                    Nhận tất cả
                  </button>
                )}
              </div>

              {suggestions.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#16a34a', padding: '8px 0' }}>
                  ✓ Đã xử lý tất cả các gợi ý sửa đổi.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {suggestions.map((sugg) => (
                    <div
                      key={sugg.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '12.5px', color: '#1e293b' }}>
                        {sugg.summary}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '11.5px', color: '#16a34a' }}
                          onClick={() => handleAcceptSuggestion(sugg.id)}
                        >
                          ✓ Nhận
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '11.5px', color: '#dc2626' }}
                          onClick={() => handleRejectSuggestion(sugg.id)}
                        >
                          X Bỏ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px', fontStyle: 'italic' }}>
                Chỉ gợi ý sửa lỗi nhỏ (chính tả, dấu câu, quy ước viết). Không đổi số, ngày, tên riêng hay diễn đạt lại câu.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {showPreviewModal && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div
            className="modal-dialog"
            style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="modal-title">Xem trước văn bản hoàn thiện</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPreviewModal(false)}>
                Đóng
              </button>
            </div>
            <DocumentPreview values={values} />
          </div>
        </div>
      )}
    </div>
  );
};
