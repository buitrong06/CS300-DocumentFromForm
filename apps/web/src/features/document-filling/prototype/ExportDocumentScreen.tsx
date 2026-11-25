import { useState } from 'react';
import { FlowHeader } from '../../../prototype/components/FlowHeader';
import type { FormValues } from '../model';
import { DOCUMENT_STEPS, DOCUMENT_TITLE, documentExportIssues } from './documentWorkflow';
import type { RequiredFieldKey } from './documentWorkflow';

interface ExportDocumentScreenProps {
  values: FormValues;
  onBack: () => void;
  onEditField: (field: RequiredFieldKey) => void;
}

interface ExportOptionsProps {
  finalAvailable?: boolean;
  snapshot?: string;
}

export function ExportOptions({ finalAvailable = true, snapshot }: ExportOptionsProps) {
  const [format, setFormat] = useState<'PDF' | 'DOCX'>('PDF');
  const [draftSelected, setDraftSelected] = useState(false);
  const [result, setResult] = useState('');
  const isDraft = !finalAvailable || draftSelected;

  return (
    <form className="pa02-export-options" onSubmit={(event) => {
      event.preventDefault();
      const version = snapshot ? `bài nộp ${snapshot}` : isDraft ? 'bản nháp' : 'bản hoàn chỉnh';
      setResult(`Đã mô phỏng xuất ${version} dưới dạng ${format}.`);
    }}>
      {snapshot ? <p>Bài nộp <strong>{snapshot}</strong></p> : (
        <fieldset>
          <legend>Phiên bản</legend>
          <label><input type="radio" name="export-version" checked={!isDraft} disabled={!finalAvailable} onChange={() => { setDraftSelected(false); setResult(''); }} /> Bản hoàn chỉnh</label>
          <label><input type="radio" name="export-version" checked={isDraft} onChange={() => { setDraftSelected(true); setResult(''); }} /> Bản nháp</label>
          {isDraft && <p className="pa02-muted">Tệp xuất ở chế độ này sẽ có nhãn Bản nháp.</p>}
        </fieldset>
      )}
      <fieldset>
        <legend>Định dạng</legend>
        <label><input type="radio" name="export-format" checked={format === 'PDF'} onChange={() => { setFormat('PDF'); setResult(''); }} /> PDF <span className="pa02-muted">để xem hoặc in</span></label>
        <label><input type="radio" name="export-format" checked={format === 'DOCX'} onChange={() => { setFormat('DOCX'); setResult(''); }} /> DOCX <span className="pa02-muted">để mở trong Word</span></label>
      </fieldset>
      <div className="pa02-actions"><button type="submit" className={'btn ' + (snapshot ? 'btn-secondary' : 'btn-primary')}>{`Mô phỏng xuất ${format}`}</button></div>
      {result && <p role="status" className="pa02-notice">{result}</p>}
      <p className="pa02-muted">Chế độ mô phỏng chỉ hiển thị kết quả thao tác.</p>
    </form>
  );
}

export function ExportDocumentScreen({ values, onBack, onEditField }: ExportDocumentScreenProps) {
  const issues = documentExportIssues(values);

  return (
    <div className="pa02-flow">
      <FlowHeader context="Việc được giao · Chi đoàn 23CTT1" title={DOCUMENT_TITLE} steps={DOCUMENT_STEPS} currentStep={2}>
        <button className="btn btn-secondary" onClick={onBack}>Quay lại kiểm tra</button>
      </FlowHeader>
      <section className="form-card pa02-form pa02-reading">
        <h2>Chọn cách xuất tài liệu</h2>
        {issues.length > 0 && (
          <div className="pa02-notice">
            <strong>Có {issues.length} mục cần sửa để xuất bản hoàn chỉnh</strong>
            <ul>
              {issues.map(({ key, label }) => (
                <li key={key}><button className="btn pa02-text-button" onClick={() => onEditField(key)}>{label}</button></li>
              ))}
            </ul>
          </div>
        )}
        <ExportOptions finalAvailable={issues.length === 0} />
      </section>
    </div>
  );
}
