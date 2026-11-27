import { useState } from 'react';
import { ArrowRight16Regular } from '@fluentui/react-icons';
import type { FormValues } from '../../document-filling';
import { DOCUMENT_STEPS, DOCUMENT_TITLE, documentExportIssues } from '../../document-filling/prototype/documentWorkflow';
import type { RequiredFieldKey } from '../../document-filling/prototype/documentWorkflow';
import { FlowHeader } from '../../../prototype/components/FlowHeader';
import type { PrototypeScreenId } from '../../../prototype/navigation';
import { INITIAL_CORRECTION_SUGGESTIONS, INITIAL_RULE_FINDINGS } from '../../../prototype/scenario';

interface ContentCheckScreenProps {
  values: FormValues;
  onChangeValues: (updater: (previous: FormValues) => FormValues) => void;
  onNavigate: (screen: PrototypeScreenId) => void;
  onEditField: (field: RequiredFieldKey) => void;
}

function suggestionField(key: string): key is 'purpose' | 'programSchedule' {
  return key === 'purpose' || key === 'programSchedule';
}

export function ContentCheckScreen({ values, onChangeValues, onNavigate, onEditField }: ContentCheckScreenProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const issues = documentExportIssues(values);
  const advisory = INITIAL_RULE_FINDINGS.filter(({ type }) => type !== 'rule');
  const suggestions = INITIAL_CORRECTION_SUGGESTIONS.filter(({ id, fieldKey, contextText }) =>
    suggestionField(fieldKey) && values[fieldKey].includes(contextText) && !dismissed.includes(id),
  );

  return (
    <div className="pa02-flow">
      <FlowHeader context="Việc được giao · Chi đoàn 23CTT1" title={DOCUMENT_TITLE} steps={DOCUMENT_STEPS} currentStep={1}>
        <button className="btn btn-secondary" onClick={() => onNavigate('screen2')}>Quay lại điền</button>
        <button className="btn btn-primary" onClick={() => onNavigate('export')}>Tiếp tục xuất tài liệu<ArrowRight16Regular aria-hidden="true" /></button>
      </FlowHeader>

      <section className="form-card pa02-form pa02-reading">
        <div>
          <h2>{issues.length ? 'Cần sửa trước khi xuất bản hoàn chỉnh' : 'Đủ điều kiện xuất bản hoàn chỉnh'}</h2>
          <p className="pa02-muted">
            {issues.length ? 'Bạn vẫn có thể xuất bản nháp. Chọn một trường để quay lại sửa.' : 'Các trường bắt buộc và quy tắc tự động đều đạt.'}
          </p>
        </div>
        {issues.length > 0 && (
          <ul className="pa02-issue-list">
            {issues.map(({ key, label, message }) => (
              <li key={key}>
                <div><strong>{label}</strong><p>{message}</p></div>
                <button className="btn btn-secondary" onClick={() => onEditField(key)}>{`Sửa ${label.toLocaleLowerCase('vi')}`}</button>
              </li>
            ))}
          </ul>
        )}
        <details className="pa02-disclosure">
          <summary>Gợi ý rà soát</summary>
          <p className="pa02-muted">Các gợi ý dưới đây không chặn xuất tài liệu.</p>
          <ul className="pa02-advisory-list">
            {advisory.map((finding) => {
              const quote = finding.evidence?.replace(/^"|"$/g, '');
              const hasEvidence = suggestionField(finding.fieldKey) && !!quote && values[finding.fieldKey].includes(quote);
              return (
                <li key={finding.id}>
                  <strong>{finding.fieldName}</strong>
                  <p>{finding.criterion}</p>
                  <p>{hasEvidence ? <q>{quote}</q> : 'Chưa đủ bằng chứng trong nội dung hiện tại. Bạn có thể tự rà soát tiêu chí này.'}</p>
                </li>
              );
            })}
          </ul>
        </details>
        <details className="pa02-disclosure">
          <summary>Gợi ý sửa lỗi nhỏ ({suggestions.length})</summary>
          {suggestions.length === 0 && <p className="pa02-muted">Chưa có gợi ý khớp với nội dung hiện tại.</p>}
          <ul className="pa02-advisory-list">
            {suggestions.map(({ id, fieldKey, summary, contextText, originalText, suggestedText }) => (
              <li key={id}>
                <strong>{summary}</strong>
                <p><q>{contextText}</q></p>
                <div className="pa02-actions">
                  <button className="btn btn-secondary" onClick={() => setDismissed((previous) => [...previous, id])}>Bỏ qua</button>
                  <button className="btn btn-secondary" onClick={() => {
                    if (!suggestionField(fieldKey)) return;
                    onChangeValues((previous) => ({
                      ...previous,
                      [fieldKey]: previous[fieldKey].replace(contextText, contextText.replace(originalText, suggestedText)),
                    }));
                    setDismissed((previous) => [...previous, id]);
                  }}>Áp dụng</button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
