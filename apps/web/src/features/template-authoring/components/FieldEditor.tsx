import { useState } from "react";

import type { DocumentBlock, FieldCandidate, FieldType } from "../formGeneration";
import { bindingText, parseOptions, rulesFor, TYPE_LABELS } from "../reviewEditing";

/** Callers must key this component by Field id so free-typed text resets per Field. */
export function FieldEditor({
  field,
  blocks,
  otherFields,
  disabled,
  onChange,
  onRemoveBinding,
  onMergeInto,
  onDelete,
}: {
  field: FieldCandidate;
  blocks: DocumentBlock[];
  otherFields: FieldCandidate[];
  disabled: boolean;
  onChange: (change: Partial<FieldCandidate>) => void;
  onRemoveBinding: (index: number) => void;
  onMergeInto: (targetId: string) => void;
  onDelete: () => void;
}) {
  // Raw text is kept locally; normalizing on each keystroke would swallow spaces and newlines.
  const [instructionText, setInstructionText] = useState(() =>
    field.instructions.map((instruction) => instruction.text).join("\n"),
  );
  const [optionText, setOptionText] = useState(() =>
    field.options.map((option) => option.label).join("\n"),
  );
  return (
    <div className="pa04-form-grid">
      <label>
        Nhãn Field
        <input disabled={disabled} value={field.label} onChange={(event) => onChange({ label: event.target.value })} />
      </label>
      <label>
        Kiểu dữ liệu
        <select
          disabled={disabled}
          value={field.type}
          onChange={(event) => {
            const type = event.target.value as FieldType;
            onChange({
              type,
              status: type === "choice" && !field.options.length ? "proposed" : field.status,
            });
          }}
        >
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Hướng dẫn
        <textarea
          disabled={disabled}
          value={instructionText}
          onChange={(event) => {
            const text = event.target.value;
            setInstructionText(text);
            onChange({ instructions: text.trim() ? [{ text }] : [] });
          }}
        />
      </label>
      {field.type === "choice" && (
        <label>
          Lựa chọn, mỗi dòng một giá trị
          <textarea
            disabled={disabled}
            value={optionText}
            onChange={(event) => {
              setOptionText(event.target.value);
              onChange({ options: parseOptions(event.target.value) });
            }}
          />
        </label>
      )}
      {rulesFor(field.type).map(({ key, label }) => (
        <label key={key}>
          {label}
          <input
            disabled={disabled}
            type="number"
            min={key === "minimum" || key === "maximum" ? undefined : 0}
            step={key === "minimum" || key === "maximum" ? "any" : 1}
            value={field.rules[key] ?? ""}
            onChange={(event) =>
              onChange({
                rules: {
                  ...field.rules,
                  [key]: event.target.value === "" ? null : Number(event.target.value),
                },
              })
            }
          />
        </label>
      ))}
      <label>
        Trạng thái review
        <select
          disabled={disabled}
          value={field.status}
          onChange={(event) => onChange({ status: event.target.value as FieldCandidate["status"] })}
        >
          <option value="proposed">Cần review</option>
          <option value="accepted">Chấp nhận làm Field</option>
          <option value="rejected">Giữ nội dung cố định</option>
        </select>
      </label>
      <label className="pa04-check-label">
        <input
          disabled={disabled}
          checked={field.rules.required}
          type="checkbox"
          onChange={(event) => onChange({ rules: { ...field.rules, required: event.target.checked } })}
        />
        Bắt buộc
      </label>
      <div className="pa04-bindings">
        <strong>{field.occurrences.length} Binding</strong>
        <ul>
          {field.occurrences.map((binding, index) => (
            <li key={`${binding.block_id}:${binding.start}:${binding.end}`}>
              <code>{bindingText(blocks, binding)}</code>
              {!disabled && field.occurrences.length > 1 && (
                <button type="button" onClick={() => onRemoveBinding(index)}>
                  Bỏ vị trí
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {!disabled && otherFields.length > 0 && (
        <label>
          Gộp Field này vào
          <select value="" onChange={(event) => event.target.value && onMergeInto(event.target.value)}>
            <option value="">Chọn Field đích</option>
            {otherFields.map((other) => (
              <option key={other.id} value={other.id}>
                {other.label}
              </option>
            ))}
          </select>
          <small className="pa04-help">
            Các vị trí trong cùng một đoạn được nối thành một vùng liền (ví dụ “ngày … tháng … năm …”).
          </small>
        </label>
      )}
      {!disabled && (
        <button type="button" className="pa04-secondary" onClick={onDelete}>
          Xóa Field
        </button>
      )}
      <p className="pa04-help">
        {Math.round(field.confidence * 100)}% confidence · nguồn: {field.methods.join(", ")}
      </p>
    </div>
  );
}
