import { useState } from "react";

import type { DocumentBlock, SourceLocation } from "../formGeneration";
import { bindingAt, codePointOffset } from "../reviewEditing";

/** Manual marking of a position in the source DOCX (UC-A03 step 4, A1 and A3). */
export function BindingPicker({
  blocks,
  selectedLabel,
  onCreate,
  onAttach,
}: {
  blocks: DocumentBlock[];
  selectedLabel: string | null;
  onCreate: (label: string, binding: SourceLocation) => void;
  onAttach: (binding: SourceLocation) => void;
}) {
  const [blockId, setBlockId] = useState("");
  const [range, setRange] = useState<[number, number] | null>(null);
  const [label, setLabel] = useState("");
  const block = blocks.find((item) => item.id === blockId) ?? null;
  const binding = block && range ? bindingAt(block, range[0], range[1]) : null;
  const picked = block && range ? Array.from(block.text).slice(range[0], range[1]).join("") : "";

  return (
    <details className="pa04-binding-picker">
      <summary>Đánh dấu vị trí thủ công</summary>
      <div className="pa04-form-grid">
        <label>
          Đoạn văn trong DOCX nguồn
          <select
            value={blockId}
            onChange={(event) => {
              setBlockId(event.target.value);
              setRange(null);
            }}
          >
            <option value="">Chọn đoạn</option>
            {blocks.map((item, index) => (
              <option key={item.id} value={item.id}>
                {index + 1}. {item.text.slice(0, 70) || `(ô/đoạn trống · ${item.id})`}
              </option>
            ))}
          </select>
        </label>
        {block && (
          <label>
            Bôi chọn phần cần thay thế, hoặc đặt con trỏ tại vị trí chèn
            <textarea
              readOnly
              value={block.text}
              onSelect={(event) => {
                const { selectionStart, selectionEnd } = event.currentTarget;
                setRange([
                  codePointOffset(block.text, selectionStart),
                  codePointOffset(block.text, selectionEnd),
                ]);
              }}
              onFocus={() => block.text === "" && setRange([0, 0])}
            />
          </label>
        )}
        <label>
          Tên Field mới
          <input value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <p className="pa04-help">
          {!range ? "Chưa chọn vị trí." : picked ? `Sẽ thay thế: “${picked}”` : `Chèn tại ký tự ${range[0]}.`}
        </p>
        <button
          type="button"
          className="pa04-secondary"
          disabled={!binding || !label.trim()}
          onClick={() => {
            if (!binding) return;
            onCreate(label, binding);
            setLabel("");
            setRange(null);
          }}
        >
          Tạo Field tại vị trí này
        </button>
        <button
          type="button"
          className="pa04-secondary"
          disabled={!binding || !selectedLabel}
          onClick={() => {
            if (!binding) return;
            onAttach(binding);
            setRange(null);
          }}
        >
          Thêm vị trí vào “{selectedLabel ?? "Field đang chọn"}”
        </button>
      </div>
    </details>
  );
}
