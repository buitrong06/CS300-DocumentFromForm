import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ExtractedFieldItem } from '../state';

interface FieldExtractScreenProps {
  fields: ExtractedFieldItem[];
  onToggleFieldStatus: (id: string) => void;
  onAddField: () => void;
}

/**
 * Field Extraction — matches Figma 4:188 (Trích xuất biểu mẫu / Light).
 * Integrates an interactive DOCX source preview where clicking spans selects/reviews the field.
 */
export function FieldExtractScreen({ fields, onToggleFieldStatus, onAddField }: FieldExtractScreenProps) {
  const [selectedId, setSelectedId] = useState<string>(fields[0]?.id ?? 'org_name');

  return (
    <>
      <div className="fapp-two-col-wide">
        {/* Source document preview */}
        <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="fapp-section-title">Tài liệu nguồn</div>
              <div className="fapp-section-help">Bản khai đăng ký tên định danh</div>
            </div>
            <span className="fapp-chip fapp-chip-violet">DOCX</span>
          </div>

          <div className="fapp-paper">
            <div className="fapp-paper-heading">BẢN KHAI ĐĂNG KÝ TÊN ĐỊNH DANH</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {fields.map((f) => (
                <div
                  key={f.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(f.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId(f.id)}
                  className={`fapp-paper-span${selectedId === f.id ? ' active' : ''}`}
                >
                  {f.sourceSpan}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detected fields review */}
        <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="fapp-section-title">Trường đã phát hiện</div>
              <div className="fapp-section-help">Xác nhận tên, kiểu dữ liệu và vị trí nguồn.</div>
            </div>
            <span className="fapp-chip fapp-chip-gray">{fields.length}/8 hiển thị</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fields.map((f) => (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(f.id)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedId(f.id)}
                className={`fapp-proposal-row${selectedId === f.id ? ' selected' : ''}`}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{f.label}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
                    {f.typeLabel} · độ tin cậy {f.confidence}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFieldStatus(f.id);
                  }}
                  className={`fapp-chip ${f.status === 'approved' ? 'fapp-chip-green' : 'fapp-chip-yellow'}`}
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  {f.status === 'approved' ? 'Đã duyệt' : 'Cần xem'}
                </button>
              </div>
            ))}
          </div>

          <div className="fapp-footer-bar" style={{ marginTop: 8 }}>
            <button type="button" className="fapp-btn fapp-btn-secondary" onClick={onAddField}>
              Thêm trường
            </button>
            <Link to="/app/forms/config" className="fapp-btn fapp-btn-primary">
              Cấu hình trường
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
