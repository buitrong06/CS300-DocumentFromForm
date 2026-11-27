import type { TemplateFieldConfig } from '../model';

interface TemplatePaperProps {
  fields: TemplateFieldConfig[];
  values?: Record<string, string>;
  selectedId?: string;
  onSelect?: (id: string) => void;
  dateResolved?: boolean;
}

function displayValue(value: string, type: TemplateFieldConfig['type']) {
  if (type !== 'date') return value;
  return value.split('-').reverse().join('/');
}

export function TemplatePaper({ fields, values, selectedId, onSelect, dateResolved = true }: TemplatePaperProps) {
  function mark(id: string) {
    const field = fields.find((item) => item.id === id);
    if (!field) return '…………';
    const label = field.label.trim() || 'Trường chưa đặt tên';
    const value = values?.[id];
    if (onSelect) {
      return <button type="button" className={'pa02-paper-mark' + (id === selectedId ? ' is-selected' : '')} aria-pressed={id === selectedId} onClick={() => onSelect(id)}>{label}</button>;
    }
    return <span className={value ? 'doc-chip-filled' : 'doc-chip-missing'}>{value ? displayValue(value, field.type) : label}</span>;
  }

  const date = fields.some((field) => field.id === 'applicationDate');
  const dateParts = fields.some((field) => field.id.startsWith('applicationDate-'));
  const extraFields = fields.filter((field) => field.id.startsWith('custom-'));

  return (
    <article className="paper-sheet pa02-template-paper" aria-label="Xem trước Đơn xin nghỉ học">
      <div className="pa02-paper-heading">
        <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
        <strong><u>Độc lập – Tự do – Hạnh phúc</u></strong>
        <h2>ĐƠN XIN NGHỈ HỌC</h2>
      </div>
      <p>Kính gửi: Ban Chủ nhiệm Khoa {mark('f1')}</p>
      <p>Em tên là: {mark('f2')} &nbsp; Ngày sinh: {mark('f3')}</p>
      <p>Mã số sinh viên: {mark('f4')} &nbsp; Lớp: {mark('f5')}</p>
      <p>Số điện thoại: {mark('f6')}</p>
      <p>Nay em kính xin nghỉ từ ngày {mark('f7')} đến ngày {mark('f8')}.</p>
      <p>Lý do: {mark('f9')}</p>
      {extraFields.map(({ id }) => <p key={id}>{mark(id)}</p>)}
      <p>Em xin cam kết hoàn thành các học phần còn nợ và chịu trách nhiệm về việc học tập trong thời gian nghỉ theo quy định của Nhà trường.</p>
      <div className="pa02-paper-signature">
        <p>TP. Hồ Chí Minh, {date ? mark('applicationDate') : dateParts ? <>ngày {mark('applicationDate-day')} tháng {mark('applicationDate-month')} năm {mark('applicationDate-year')}</> : !dateResolved ? <span className="doc-chip-ambiguous">ngày … tháng … năm …</span> : '……………………'}</p>
        <strong>Người làm đơn</strong>
        <p>(Ký và ghi rõ họ tên)</p>
        <p>{mark('f2')}</p>
      </div>
    </article>
  );
}
