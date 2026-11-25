import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ExtractedFieldItem, FillDocumentValues } from '../state';
import { DocumentPreviewCard } from '../components/DocumentPreviewCard';

interface FieldConfigScreenProps {
  fields: ExtractedFieldItem[];
  onUpdateField: (id: string, patch: Partial<ExtractedFieldItem>) => void;
  previewValues: FillDocumentValues;
}

const TYPE_OPTIONS: { value: ExtractedFieldItem['type']; label: string }[] = [
  { value: 'short_text', label: 'Văn bản ngắn' },
  { value: 'number', label: 'Số' },
  { value: 'date', label: 'Ngày' },
  { value: 'long_text', label: 'Văn bản dài' },
];

/**
 * Field Configuration — matches Figma 17:96 (Cấu hình trường / Light)
 * with an integrated live preview toggle so creators can preview the resulting document.
 */
export function FieldConfigScreen({ fields, onUpdateField, previewValues }: FieldConfigScreenProps) {
  const [selectedId, setSelectedId] = useState<string>(fields[2]?.id ?? fields[0]?.id ?? '');
  const [showPreview, setShowPreview] = useState(false);

  const selected = fields.find((f) => f.id === selectedId) ?? fields[0];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Bản khai đăng ký tên định danh</div>
        <div className="fapp-actions">
          <span className="fapp-chip fapp-chip-gray">{fields.length}/8 hiển thị</span>
          <button
            type="button"
            className="fapp-btn fapp-btn-secondary fapp-btn-sm"
            onClick={() => setShowPreview((p) => !p)}
          >
            {showPreview ? 'Ẩn xem trước' : 'Xem trước tài liệu'}
          </button>
        </div>
      </div>

      <div className="fapp-two-col-wide">
        {/* Field list */}
        <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fapp-section-title">Trường đã phát hiện</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fields.map((f) => (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(f.id)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedId(f.id)}
                className={`fapp-proposal-row${selected?.id === f.id ? ' selected' : ''}`}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{f.label}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>{f.typeLabel}</div>
                </div>
                <span style={{ fontSize: 18, color: '#94a3b8' }}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Field editor or integrated live preview */}
        {showPreview ? (
          <DocumentPreviewCard values={previewValues} title="Xem trước mẫu tài liệu" />
        ) : (
          <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="fapp-section-title">Cài đặt trường</div>
              <div className="fapp-section-help">{selected?.label}</div>
            </div>

            {selected && (
              <>
                <div className="fapp-field-group">
                  <label className="fapp-field-label" htmlFor="cfg-label">Nhãn</label>
                  <input
                    id="cfg-label"
                    className="fapp-input"
                    value={selected.label}
                    onChange={(e) => onUpdateField(selected.id, { label: e.target.value })}
                  />
                </div>

                <div className="fapp-field-group">
                  <label className="fapp-field-label" htmlFor="cfg-type">Kiểu dữ liệu</label>
                  <select
                    id="cfg-type"
                    className="fapp-input"
                    value={selected.type}
                    onChange={(e) => {
                      const next = e.target.value as ExtractedFieldItem['type'];
                      const label = TYPE_OPTIONS.find((o) => o.value === next)?.label ?? next;
                      onUpdateField(selected.id, { type: next, typeLabel: label });
                    }}
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="fapp-field-group">
                  <span className="fapp-field-label">Quy tắc</span>
                  <div className="fapp-actions">
                    <button
                      type="button"
                      className={`fapp-chip ${selected.required ? 'fapp-chip-violet' : 'fapp-chip-gray'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => onUpdateField(selected.id, { required: !selected.required })}
                    >
                      Bắt buộc
                    </button>
                    {selected.maxLength && (
                      <span className="fapp-chip fapp-chip-gray">Tối đa {selected.maxLength} ký tự</span>
                    )}
                  </div>
                </div>

                <div className="fapp-field-group">
                  <label className="fapp-field-label" htmlFor="cfg-inst">Hướng dẫn</label>
                  <input
                    id="cfg-inst"
                    className="fapp-input"
                    value={selected.instruction}
                    onChange={(e) => onUpdateField(selected.id, { instruction: e.target.value })}
                  />
                </div>

                <div style={{ fontSize: 12.5, color: '#64748b' }}>
                  Đã lưu · {fields.length}/8 trường hiển thị
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="fapp-footer-bar">
        <Link to="/app/forms/extract" className="fapp-btn fapp-btn-secondary">Quay lại trích xuất</Link>
        <Link to="/app/forms/checklist" className="fapp-btn fapp-btn-primary">Tiếp tục kiểm tra</Link>
      </div>
    </>
  );
}
