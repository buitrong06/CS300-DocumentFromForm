import { Link } from 'react-router-dom';

/** Create Form — matches Figma 17:55 (Tạo biểu mẫu / Light) */
export function CreateFormScreen() {
  return (
    <>
      <div className="fapp-section-title">Chọn nguồn để bắt đầu.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
        <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="fapp-chip fapp-chip-violet" style={{ alignSelf: 'flex-start' }}>01</span>
          <div>
            <div className="fapp-section-title">Upload DOCX</div>
            <p className="fapp-section-help">Tải mẫu văn bản có sẵn lên workspace.</p>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <Link to="/app/forms/extract" className="fapp-btn fapp-btn-primary">Upload DOCX</Link>
          </div>
        </div>

        <div className="fapp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="fapp-chip fapp-chip-gray" style={{ alignSelf: 'flex-start' }}>02</span>
          <div>
            <div className="fapp-section-title">Tạo từ preset</div>
            <p className="fapp-section-help">Bắt đầu từ một preset đã được duyệt.</p>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <Link to="/app/forms/config" className="fapp-btn fapp-btn-secondary">Tạo từ preset</Link>
          </div>
        </div>
      </div>

      <div className="fapp-footer-bar">
        <Link to="/app/forms" className="fapp-btn fapp-btn-secondary">Quay lại biểu mẫu</Link>
      </div>
    </>
  );
}
