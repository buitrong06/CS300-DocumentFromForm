import type { DraftField, ValidationFinding } from "../types";
import { RichTextField } from "./RichTextField";

export function DraftFieldInput({
  field,
  value,
  findings,
  onChange,
}: {
  field: DraftField;
  value: string;
  findings: ValidationFinding[];
  onChange: (value: string) => void;
}) {
  const fieldId = `field-${field.id}`;
  const errors = findings.filter((finding) => finding.status === "failed");
  const helpId = `${fieldId}-help`;
  // A wrapping <label> would forward clicks to the rich-text toolbar buttons.
  const Wrapper = field.field_type === "long_text" ? "div" : "label";
  return (
    <Wrapper className="pa04-draft-field" htmlFor={Wrapper === "label" ? fieldId : undefined}>
      <span>
        {field.label} {field.is_required && <b aria-label="Bắt buộc">*</b>}
      </span>
      {field.instructions && <small id={helpId}>{field.instructions}</small>}
      {field.field_type === "long_text" ? (
        <RichTextField id={fieldId} value={value} disabled={false} onChange={onChange} />
      ) : field.field_type === "choice" ? (
        <select id={fieldId} value={value} aria-describedby={helpId} onChange={(event) => onChange(event.target.value)}>
          <option value="">Chọn một giá trị</option>
          {field.choice_options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={fieldId}
          aria-describedby={helpId}
          type={field.field_type === "date" ? "date" : field.field_type === "number" || field.field_type === "amount_of_money" ? "number" : "text"}
          step={field.field_type === "number" || field.field_type === "amount_of_money" ? "any" : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {errors.map((finding) => (
        <small className="pa04-field-error" key={finding.code}>
          {finding.message}
        </small>
      ))}
    </Wrapper>
  );
}
