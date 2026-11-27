import { useEffect, useState } from 'react';
import { ArrowRight16Regular } from '@fluentui/react-icons';
import type { FormValues } from '../model';
import type { PrototypeScreenId } from '../../../prototype/navigation';
import { FlowHeader } from '../../../prototype/components/FlowHeader';
import { DocumentPreview } from './DocumentPreview';
import { DOCUMENT_DUE_LABEL, DOCUMENT_STEPS, DOCUMENT_TITLE, REQUIRED_FIELDS, documentExportIssues, missingRequiredFields } from './documentWorkflow';
import type { RequiredFieldKey } from './documentWorkflow';

interface GuidedFormScreenProps {
  values: FormValues;
  onChangeValues: (updater: (prev: FormValues) => FormValues) => void;
  onNavigate: (screen: PrototypeScreenId) => void;
  focusField?: RequiredFieldKey;
}

const FIELD_HELP: Partial<Record<RequiredFieldKey, string>> = {
  purpose: 'Nêu mục đích và đối tượng tham gia.',
  programSchedule: 'Liệt kê các hoạt động chính theo thứ tự thời gian.',
  totalBudget: 'Nhập số tiền bằng đồng Việt Nam.',
  signatory: 'Nhập họ tên Bí thư chi đoàn.',
};

function focusInput(key: RequiredFieldKey) {
  const input = document.getElementById('draft-' + key);
  input?.focus();
  input?.scrollIntoView({ block: 'center' });
}

export function GuidedFormScreen({ values, onChangeValues, onNavigate, focusField }: GuidedFormScreenProps) {
  const [preview, setPreview] = useState<'auto' | 'open' | 'closed'>('auto');
  const [visitedFields, setVisitedFields] = useState<RequiredFieldKey[]>([]);
  const missing = missingRequiredFields(values);
  const issues = documentExportIssues(values);
  const completed = REQUIRED_FIELDS.length - missing.length;

  useEffect(() => {
    if (focusField) focusInput(focusField);
  }, [focusField]);

  return (
    <div className="pa02-flow">
      <FlowHeader
        context="Việc được giao · Chi đoàn 23CTT1"
        title={DOCUMENT_TITLE}
        description={`Giao bởi BCH Đoàn khoa · Hạn ${DOCUMENT_DUE_LABEL}`}
        steps={DOCUMENT_STEPS}
        currentStep={0}
      >
        <button className="btn btn-secondary" onClick={() => onNavigate('screen4')}>Giao bớt việc</button>
        <button className="btn btn-primary" onClick={() => onNavigate('screen3')}>Kiểm tra nội dung<ArrowRight16Regular aria-hidden="true" /></button>
      </FlowHeader>

      <div className={'pa02-progress pa02-progress-' + preview}>
        <div>
          <strong>{completed}/{REQUIRED_FIELDS.length}</strong> trường bắt buộc đã điền
          <progress aria-label="Số trường bắt buộc đã điền" value={completed} max={REQUIRED_FIELDS.length} />
        </div>
        <div className="pa02-actions">
          {missing.length > 0 && (
            <button className="btn pa02-text-button pa02-jump-field" onClick={() => focusInput(missing[0].key)}>Đến ô còn thiếu</button>
          )}
          {preview === 'auto' ? (
            <>
              <button className="btn btn-secondary pa02-wide-only" aria-expanded="true" onClick={() => setPreview('closed')}>Ẩn bản xem trước</button>
              <button className="btn btn-secondary pa02-narrow-only" aria-expanded="false" onClick={() => setPreview('open')}>Xem trước văn bản</button>
            </>
          ) : (
            <button className="btn btn-secondary" aria-expanded={preview === 'open'} onClick={() => setPreview(preview === 'open' ? 'closed' : 'open')}>
              {preview === 'open' ? 'Ẩn bản xem trước' : 'Xem trước văn bản'}
            </button>
          )}
        </div>
      </div>

      <div className={'pa02-editor pa02-preview-' + preview}>
        <div className="form-card pa02-form">
          {[
            { title: 'Thông tin chung', fields: REQUIRED_FIELDS.slice(0, 5) },
            { title: 'Nội dung tờ trình', fields: REQUIRED_FIELDS.slice(5) },
          ].map(({ title, fields }) => (
            <section key={title} className="pa02-field-section">
              <h2>{title}</h2>
              <div className="pa02-input-grid">
                {fields.map(({ key, label }) => {
                  const id = 'draft-' + key;
                  const isLongText = key === 'purpose' || key === 'programSchedule';
                  const help = FIELD_HELP[key];
                  const issue = (focusField === key || visitedFields.includes(key))
                    ? issues.find((item) => item.key === key)
                    : undefined;
                  const inputProps = {
                    id,
                    required: true,
                    'aria-invalid': issue ? true : undefined,
                    'aria-describedby': [issue && id + '-error', help && id + '-help'].filter(Boolean).join(' ') || undefined,
                    onBlur: () => setVisitedFields((previous) => previous.includes(key) ? previous : [...previous, key]),
                  };
                  return (
                    <div key={key} className={'form-group' + (isLongText || key === 'activityName' ? ' pa02-input-wide' : '')}>
                      <label className="form-label" htmlFor={id}>{label} <span aria-hidden="true">*</span></label>
                      {help && <p id={id + '-help'} className="form-help">{help}</p>}
                      {isLongText ? (
                        <textarea
                          {...inputProps}
                          className="form-input pa02-textarea"
                          value={values[key]}
                          onChange={(event) => {
                            const value = event.target.value;
                            onChangeValues((previous) => ({ ...previous, [key]: value }));
                          }}
                        />
                      ) : key === 'totalBudget' ? (
                        <div className="form-input-addon">
                          <input
                            {...inputProps}
                            className="form-input"
                            type="number"
                            min={1}
                            value={values.totalBudget || ''}
                            onChange={(event) => {
                              const totalBudget = Number(event.target.value);
                              onChangeValues((previous) => ({ ...previous, totalBudget }));
                            }}
                          />
                          <span className="input-suffix" aria-hidden="true">₫</span>
                        </div>
                      ) : (
                        <input
                          {...inputProps}
                          className="form-input"
                          type={key === 'createDate' || key === 'eventDate' ? 'date' : 'text'}
                          value={values[key]}
                          onChange={(event) => {
                            const value = event.target.value;
                            onChangeValues((previous) => ({ ...previous, [key]: value }));
                          }}
                        />
                      )}
                      {issue && <p id={id + '-error'} className="pa02-field-error">{issue.message}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <p className="pa02-muted">Các thay đổi được giữ trong phiên PA02 này.</p>
        </div>
        {preview !== 'closed' && (
          <aside className="pa02-preview" aria-label="Bản xem trước văn bản">
            <DocumentPreview values={values} />
          </aside>
        )}
      </div>
    </div>
  );
}
