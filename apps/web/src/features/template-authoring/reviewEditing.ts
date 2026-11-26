/** Pure editing operations for the UC-A03 field review. The server re-validates Bindings. */
import type {
  DocumentBlock,
  FieldCandidate,
  FieldRules,
  FieldType,
  SourceLocation,
} from "./formGeneration";

/** Browser selections count UTF-16 units; the server counts Unicode code points. */
export function codePointOffset(text: string, utf16Offset: number): number {
  return Array.from(text.slice(0, utf16Offset)).length;
}

export function bindingAt(block: DocumentBlock, start: number, end: number): SourceLocation {
  const characters = Array.from(block.text);
  return {
    block_id: block.id,
    start,
    end,
    path: block.path,
    excerpt: characters.slice(Math.max(0, start - 30), end + 30).join(""),
  };
}

export function bindingText(blocks: DocumentBlock[], binding: SourceLocation): string {
  const block = blocks.find((item) => item.id === binding.block_id);
  if (!block) return binding.excerpt;
  const characters = Array.from(block.text);
  const marked = characters.slice(binding.start, binding.end).join("") || "▏";
  const before = characters.slice(Math.max(0, binding.start - 20), binding.start).join("");
  const after = characters.slice(binding.end, binding.end + 20).join("");
  return `${before}[${marked}]${after}`;
}

export function manualField(id: string, label: string, binding: SourceLocation): FieldCandidate {
  return {
    id,
    label: label.trim() || "Field mới",
    type: "short_text",
    status: "accepted",
    occurrences: [binding],
    methods: ["manual"],
    confidence: 1,
    evidence: [],
    instructions: [],
    requirements: [],
    options: [],
    rules: { required: false },
  };
}

export function addBinding(
  candidates: FieldCandidate[],
  fieldId: string,
  binding: SourceLocation,
): FieldCandidate[] {
  return candidates.map((candidate) =>
    candidate.id === fieldId
      ? { ...candidate, occurrences: [...candidate.occurrences, binding] }
      : candidate,
  );
}

/** A Field keeps at least one Binding; remove or reject the whole Field instead. */
export function removeBinding(
  candidates: FieldCandidate[],
  fieldId: string,
  index: number,
): FieldCandidate[] {
  return candidates.map((candidate) =>
    candidate.id === fieldId && candidate.occurrences.length > 1
      ? { ...candidate, occurrences: candidate.occurrences.filter((_, item) => item !== index) }
      : candidate,
  );
}

/**
 * Merge `sourceId` into `targetId` (UC-A03 A4). Pieces in the same paragraph, such as
 * "ngày ... tháng ... năm ...", become one covering range so the value is written once.
 * Bindings in different paragraphs stay separate positions of the same Field.
 */
export function mergeFields(
  candidates: FieldCandidate[],
  blocks: DocumentBlock[],
  sourceId: string,
  targetId: string,
): FieldCandidate[] {
  const source = candidates.find((candidate) => candidate.id === sourceId);
  const target = candidates.find((candidate) => candidate.id === targetId);
  if (!source || !target || sourceId === targetId) return candidates;
  const merged: SourceLocation[] = [];
  for (const binding of [...target.occurrences, ...source.occurrences]) {
    const index = merged.findIndex((item) => item.block_id === binding.block_id);
    const existing = merged[index];
    const block = blocks.find((item) => item.id === binding.block_id);
    if (!existing || !block) {
      merged.push(binding);
      continue;
    }
    merged[index] = bindingAt(
      block,
      Math.min(existing.start, binding.start),
      Math.max(existing.end, binding.end),
    );
  }
  return candidates
    .filter((candidate) => candidate.id !== sourceId)
    .map((candidate) =>
      candidate.id === targetId
        ? {
            ...candidate,
            occurrences: merged,
            methods: Array.from(new Set([...target.methods, ...source.methods])),
            instructions: [...target.instructions, ...source.instructions],
          }
        : candidate,
    );
}

export type NumericRule = "min_length" | "max_length" | "minimum" | "maximum" | "decimal_places";

export function rulesFor(type: FieldType): { key: NumericRule; label: string }[] {
  if (type === "short_text" || type === "long_text") {
    return [
      { key: "min_length", label: "Số ký tự tối thiểu" },
      { key: "max_length", label: "Số ký tự tối đa" },
    ];
  }
  if (type === "number" || type === "money") {
    return [
      { key: "minimum", label: "Giá trị nhỏ nhất" },
      { key: "maximum", label: "Giá trị lớn nhất" },
      { key: "decimal_places", label: "Số chữ số thập phân tối đa" },
    ];
  }
  return [];
}

function applicableRules(candidate: FieldCandidate): FieldRules {
  const rules: FieldRules = { required: candidate.rules.required };
  for (const { key } of rulesFor(candidate.type)) {
    const value = candidate.rules[key];
    if (value !== null && value !== undefined) rules[key] = value;
  }
  if (candidate.type === "money") rules.currency = candidate.rules.currency;
  return rules;
}

export function parseOptions(text: string): FieldCandidate["options"] {
  const values = text.split("\n").map((line) => line.trim());
  return Array.from(new Set(values.filter(Boolean))).map((value) => ({ value, label: value }));
}

/** Normalize free-typed editor state just before it is sent to the server. */
export function prepareForSave(candidates: FieldCandidate[]): FieldCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    label: candidate.label.trim(),
    instructions: candidate.instructions.filter((instruction) => instruction.text.trim()),
    options:
      candidate.type === "choice"
        ? candidate.options.filter((option) => option.label.trim())
        : candidate.options,
    rules: applicableRules(candidate),
  }));
}

export const TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Văn bản ngắn",
  long_text: "Văn bản dài",
  date: "Ngày",
  number: "Số",
  money: "Số tiền",
  choice: "Lựa chọn",
};
