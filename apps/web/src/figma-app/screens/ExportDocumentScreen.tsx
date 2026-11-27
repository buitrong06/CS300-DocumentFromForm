import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FillDocumentValues } from '../state';
import { DocumentPreviewCard } from '../components/DocumentPreviewCard';

interface ExportDocumentScreenProps {
  values: FillDocumentValues;
  onNotify: (title: string, detail: string) => void;
}

/**
 * Export Document — matches Figma 17:329 (Xuất tài liệu / Light).
 * Integrates live DocumentPreviewCard + DOCX/PDF format selection and download toast.
 */
export function ExportDocumentScreen({ values, onNotify }: ExportDocumentScreenProps) {
  const [format, setFormat] = useState<'DOCX' | 'PDF'>('DOCX');
  const [filename, setFilename] = useState('dang-ky-ten-dinh-danh-nguyen-minh-anh');

  return (
    <>
      <div>
        <div className="fapp-section-title" style={{ fontSize: 20 }}>Tài liệu đã sẵn sàng để tải</div>
        <p className="fapp-section-help">
          Bản xem trước dùng cùng định nghĩa trường đã duyệt. Tên tệp sẽ tự thêm đuôi tương ứng.
        </p>
      </div>

      <div className="fapp-two-col">
        <div className="fapp-card">
          <div className="fapp-field-group">
            <span className="fapp-field-label">Định dạng tải xuống</span>
            <div className="fapp-actions">
              {(['DOCX', 'PDF'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className={`fapp-chip ${format === fmt ? 'fapp-chip-violet' : 'fapp-chip-gray'}`}
                  style={{ border: 'none', cursor: 'pointer' }}
                  onClick={() => setFormat(fmt)}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="fapp-field-group">
            <span className="fapp-field-label">Trạng thái kiểm tra</span>
            <div>
              <span className="fapp-chip fapp-chip-green">Sẵn sàng tải</span>
            </div>
          </div>

          <div className="fapp-field-group">
            <label className="fapp-field-label" htmlFor="export-filename">Tên tệp</label>
            <input
              id="export-filename"
              className="fapp-input"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Tệp xuất: {filename}.{format.toLowerCase()}
            </span>
          </div>
        </div>

        <DocumentPreviewCard values={values} title="Xem trước tài liệu" />
      </div>

      <div className="fapp-footer-bar">
        <Link to="/app/tasks/check" className="fapp-btn fapp-btn-secondary">← Quay lại kết quả</Link>
        <div className="fapp-actions">
          <button
            type="button"
            className="fapp-btn fapp-btn-secondary"
            onClick={() => onNotify('Đã tải PDF', `${filename}.pdf đã được tạo thành công.`)}
          >
            Tải PDF
          </button>
          <button
            type="button"
            className="fapp-btn fapp-btn-primary"
            onClick={() => onNotify('Đã tải DOCX', `${filename}.docx đã được tạo thành công.`)}
          >
            Tải DOCX
          </button>
        </div>
      </div>
    </>
  );
}
