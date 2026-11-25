import type { TemplateFieldConfig } from '../model';
import { TemplatePaper } from './TemplatePaper';

const FIELD_TYPES = {
  short_text: 'Văn bản ngắn',
  long_text: 'Văn bản dài',
  date: 'Ngày',
  number: 'Số',
  money: 'Số tiền',
  choice: 'Lựa chọn',
} as const;

const APPLICATION_DATE = {
  instructions: 'Nhập ngày lập đơn.',
  required: true,
  positionsCount: 1,
};

interface FieldConfigurationScreenProps {
  fields: TemplateFieldConfig[];
  setFields: (fields: TemplateFieldConfig[]) => void;
  selectedId: string;
  onSelectField: (id: string) => void;
  dateResolved: boolean;
  onResolveDate: () => void;
}

export function FieldConfigurationScreen({
  fields, setFields, selectedId, onSelectField, dateResolved, onResolveDate,
}: FieldConfigurationScreenProps) {
  const selected = fields.find(({ id }) => id === selectedId);

  function update(patch: Partial<TemplateFieldConfig>) {
    setFields(fields.map((field) => field.id === selectedId ? { ...field, ...patch } : field));
  }

  function addField() {
    const id = 'custom-' + crypto.randomUUID();
    setFields([...fields, { id, key: id, label: 'Trường mới', type: 'short_text', required: false, positionsCount: 1, instructions: '' }]);
    onSelectField(id);
  }

  function resolveDate(merge: boolean) {
    const dateFields: TemplateFieldConfig[] = merge ? [
      { ...APPLICATION_DATE, id: 'applicationDate', key: 'applicationDate', label: 'Ngày làm đơn', type: 'date' },
    ] : [
      { ...APPLICATION_DATE, id: 'applicationDate-day', key: 'application_day', label: 'Ngày', type: 'number' },
      { ...APPLICATION_DATE, id: 'applicationDate-month', key: 'application_month', label: 'Tháng', type: 'number' },
      { ...APPLICATION_DATE, id: 'applicationDate-year', key: 'application_year', label: 'Năm', type: 'number' },
    ];
    setFields([...fields, ...dateFields]);
    onSelectField(dateFields[0].id);
    onResolveDate();
  }

  return (
    <div className="pa02-editor pa02-config-grid">
      <section className="form-card pa02-form" aria-label="Cấu hình các trường">
        <div className="pa02-section-heading">
          <div>
            <h2>Trường của biểu mẫu</h2>
            <p className="pa02-muted">{fields.length} trường · Chọn một trường để chỉnh sửa.</p>
          </div>
          <button className="btn btn-secondary" onClick={addField}>Thêm trường</button>
        </div>
        {!dateResolved && (
          <div className="pa02-notice">
            <strong>3 chỗ trống liền nhau trông giống một ngày tháng</strong>
            <p>Chọn cách hiển thị phần ngày làm đơn trong biểu mẫu.</p>
            <div className="pa02-actions">
              <button className="btn btn-secondary" onClick={() => resolveDate(true)}>Gộp thành Ngày làm đơn</button>
              <button className="btn btn-secondary" onClick={() => resolveDate(false)}>Giữ 3 trường riêng</button>
            </div>
          </div>
        )}
        {fields.length > 0 && (
          <div className="form-group">
            <label htmlFor="pa02-field-select" className="form-label">Trường đang chỉnh sửa</label>
            <select id="pa02-field-select" className="form-input" value={selected?.id || ''} onChange={(event) => onSelectField(event.target.value)}>
              {fields.map(({ id, label }) => <option key={id} value={id}>{label.trim() || 'Trường chưa đặt tên'}</option>)}
            </select>
          </div>
        )}
        {selected ? (
          <div className="pa02-field-section">
            <div className="pa02-input-grid">
              <label className="form-group"><span className="form-label">Nhãn trường</span><input className="form-input" value={selected.label} onChange={(event) => update({ label: event.target.value })} /></label>
              <label className="form-group"><span className="form-label">Kiểu dữ liệu</span>
                <select className="form-input" value={selected.type} onChange={(event) => update({ type: event.target.value as TemplateFieldConfig['type'] })}>
                  {Object.entries(FIELD_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {selected.type === 'choice' && (
                <label className="form-group pa02-input-wide"><span className="form-label">Các lựa chọn, mỗi dòng một mục</span>
                  <textarea className="form-input" value={selected.choices?.join('\n') ?? ''} onChange={(event) => update({ choices: event.target.value.split('\n') })} />
                </label>
              )}
              <label className="form-group pa02-input-wide"><span className="form-label">Hướng dẫn cho người điền</span>
                <textarea className="form-input pa02-textarea" value={selected.instructions} onChange={(event) => update({ instructions: event.target.value })} />
              </label>
            </div>
            <div className="pa02-section-heading">
              <label><input type="checkbox" checked={selected.required} onChange={(event) => update({ required: event.target.checked })} /> Bắt buộc</label>
              <button className="btn btn-outline-danger" onClick={() => {
                const remaining = fields.filter(({ id }) => id !== selectedId);
                setFields(remaining);
                onSelectField(remaining[0]?.id ?? '');
              }}>Xóa trường</button>
            </div>
            <p className="pa02-muted">{selected.positionsCount} vị trí trong văn bản</p>
          </div>
        ) : <p className="pa02-muted">Chưa có trường nào. Chọn Thêm trường để bắt đầu.</p>}
        <details className="pa02-disclosure">
          <summary>Kết quả nhận diện</summary>
          <p>Từ dòng chấm "......" trong mẫu minh họa. Chữ thường là nội dung cố định.</p>
          <ul className="pa02-advisory-list">
            {fields.map(({ id, label }) => <li key={id}><button className="btn pa02-text-button" onClick={() => onSelectField(id)}>{label.trim() || 'Trường chưa đặt tên'}</button></li>)}
          </ul>
        </details>
      </section>
      <TemplatePaper fields={fields} selectedId={selectedId} onSelect={onSelectField} dateResolved={dateResolved} />
    </div>
  );
}
