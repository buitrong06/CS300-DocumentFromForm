import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ArrowRight16Regular } from '@fluentui/react-icons';
import { FlowHeader } from '../../../prototype/components/FlowHeader';
import { INITIAL_TEMPLATE_FIELDS } from '../../../prototype/scenario';
import type { TemplateFieldConfig } from '../model';
import { FieldConfigurationScreen } from './FieldConfigurationScreen';
import { TemplatePaper } from './TemplatePaper';

const TEMPLATE_TITLE = 'Đơn xin nghỉ học';
const TEMPLATE_STEPS = ['Chọn nguồn mẫu', 'Cấu hình trường', 'Điền thử và lưu'] as const;

interface TemplateAuthoringFlowProps {
  onHome: () => void;
}

export function TemplateAuthoringFlow({ onHome }: TemplateAuthoringFlowProps) {
  const [step, setStep] = useState<'source' | 'fields' | 'test' | 'saved'>('source');
  const [source, setSource] = useState<'word' | 'preset'>('word');
  const [fields, setFields] = useState(INITIAL_TEMPLATE_FIELDS);
  const [selectedId, setSelectedId] = useState('f1');
  const [dateResolved, setDateResolved] = useState(false);
  const [message, setMessage] = useState('');
  const flow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (flow.current?.closest('[hidden]')) return;
    window.scrollTo(0, 0);
    flow.current?.querySelector('h1')?.focus({ preventScroll: true });
  }, [step]);

  function continueToTest() {
    if (!dateResolved) {
      setMessage('Xác nhận cách điền phần ngày làm đơn trước.');
      return;
    }
    if (!fields.length) {
      setMessage('Thêm ít nhất một trường để tiếp tục.');
      return;
    }
    const invalid = fields.find((field) => !field.label.trim() || (field.type === 'choice' && !field.choices?.some((choice) => choice.trim())));
    if (invalid) {
      setSelectedId(invalid.id);
      setMessage(!invalid.label.trim() ? 'Điền nhãn cho trường đang chọn.' : 'Thêm ít nhất một lựa chọn cho trường đang chọn.');
      return;
    }
    setMessage('');
    setStep('test');
  }

  if (step === 'saved') {
    return (
      <div className="pa02-flow" ref={flow}>
        <FlowHeader context="Thư viện mẫu" title={TEMPLATE_TITLE} steps={TEMPLATE_STEPS} currentStep={3}>
          <button className="btn btn-primary" onClick={onHome}>Về trang bắt đầu</button>
        </FlowHeader>
        <section className="form-card pa02-form pa02-reading">
          <h2 role="status">Đã lưu mẫu trong phiên PA02</h2>
          <p>Đã giữ cấu hình {fields.length} trường. Dữ liệu nhập khi điền thử đã được bỏ.</p>
          <div className="pa02-actions"><button className="btn btn-secondary" onClick={() => setStep('fields')}>Xem lại cấu hình</button></div>
        </section>
      </div>
    );
  }

  return (
    <div className="pa02-flow" ref={flow}>
      <FlowHeader
        context="Thư viện mẫu · Tạo mẫu"
        title={step === 'source' ? 'Tạo mẫu biểu' : TEMPLATE_TITLE}
        description={step === 'source' ? 'Chọn cách bắt đầu với mẫu Đơn xin nghỉ học.' : source === 'word' ? 'Nguồn: Word minh họa' : 'Nguồn: Mẫu định dạng minh họa'}
        steps={TEMPLATE_STEPS}
        currentStep={step === 'source' ? 0 : step === 'fields' ? 1 : 2}
      >
        <button className="btn btn-secondary" onClick={step === 'source' ? onHome : () => {
          setMessage('');
          setStep(step === 'test' ? 'fields' : 'source');
        }}>{step === 'source' ? 'Về trang bắt đầu' : step === 'test' ? 'Quay lại cấu hình' : 'Đổi nguồn mẫu'}</button>
        {step === 'source' && <button className="btn btn-primary" onClick={() => setStep('fields')}>Tiếp tục cấu hình<ArrowRight16Regular aria-hidden="true" /></button>}
        {step === 'fields' && <button className="btn btn-primary" onClick={continueToTest}>Điền thử biểu mẫu<ArrowRight16Regular aria-hidden="true" /></button>}
        {step === 'test' && <button className="btn btn-primary" onClick={() => setStep('saved')}>Lưu mẫu</button>}
      </FlowHeader>

      {step === 'source' && (
        <section className="form-card pa02-form pa02-reading">
          <fieldset className="pa02-source-options">
            <legend>Nguồn mẫu</legend>
            <label>
              <input type="radio" name="template-source" checked={source === 'word'} onChange={() => setSource('word')} />
              <span><strong>Dùng tài liệu Word minh họa</strong><span className="pa02-muted">Rà soát các chỗ trống có sẵn trong Đơn xin nghỉ học.</span></span>
            </label>
            <label>
              <input type="radio" name="template-source" checked={source === 'preset'} onChange={() => setSource('preset')} />
              <span><strong>Dùng mẫu định dạng minh họa</strong><span className="pa02-muted">Bắt đầu từ khung Đơn xin nghỉ học có sẵn.</span></span>
            </label>
          </fieldset>
          <p className="pa02-muted">Có tệp của riêng bạn? <a href="/templates/import">Mở công cụ trích xuất từ Word</a>.</p>
        </section>
      )}

      {step === 'fields' && (
        <>
          {message && <p role="alert" className="pa02-notice">{message}</p>}
          <FieldConfigurationScreen
            fields={fields}
            setFields={(next) => { setFields(next); setMessage(''); }}
            selectedId={selectedId}
            onSelectField={setSelectedId}
            dateResolved={dateResolved}
            onResolveDate={() => setDateResolved(true)}
          />
        </>
      )}

      {step === 'test' && <TemplateTestFill fields={fields} />}
    </div>
  );
}

function TemplateTestFill({ fields }: { fields: TemplateFieldConfig[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const missing = fields.filter(({ id, required }) => required && !values[id]?.trim());

  return (
    <div className="pa02-editor pa02-config-grid">
      <section className="form-card pa02-form">
        <div>
          <h2>Biểu mẫu điền thử</h2>
          <p className="pa02-muted">Dùng dữ liệu ví dụ. Khi lưu mẫu, chỉ cấu hình trường được giữ.</p>
        </div>
        <div className="pa02-input-grid">
          {fields.map(({ id, label, type, choices, instructions, required }) => {
            const inputProps = {
              id: 'test-input-' + id,
              value: values[id] ?? '',
              required,
              'aria-describedby': instructions ? 'test-help-' + id : undefined,
              'aria-invalid': checked && missing.some((field) => field.id === id),
              onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                const value = event.target.value;
                setValues((previous) => ({ ...previous, [id]: value }));
              },
            };
            return (
              <div className={'form-group' + (type === 'long_text' ? ' pa02-input-wide' : '')} key={id}>
                <label className="form-label" htmlFor={inputProps.id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
                {instructions && <span id={'test-help-' + id} className="form-help">{instructions}</span>}
                {type === 'long_text' ? <textarea className="form-input pa02-textarea" {...inputProps} /> :
                  type === 'choice' ? (
                    <select className="form-input" {...inputProps}>
                      <option value="">Chọn một mục</option>
                      {Array.from(new Set(choices?.map((choice) => choice.trim()).filter(Boolean))).map((choice) => <option key={choice}>{choice}</option>)}
                    </select>
                  ) : <input className="form-input" type={type === 'date' ? 'date' : type === 'number' || type === 'money' ? 'number' : 'text'} {...inputProps} />}
              </div>
            );
          })}
        </div>
        <div className="pa02-actions"><button className="btn btn-secondary" onClick={() => setChecked(true)}>Kiểm tra dữ liệu thử</button></div>
        {checked && (
          <p role="status" className="pa02-notice">
            {missing.length ? 'Còn thiếu: ' + missing.map(({ label }) => label).join(', ') + '.' : 'Đã điền đủ các trường bắt buộc.'}
          </p>
        )}
      </section>
      <TemplatePaper fields={fields} values={values} />
    </div>
  );
}
