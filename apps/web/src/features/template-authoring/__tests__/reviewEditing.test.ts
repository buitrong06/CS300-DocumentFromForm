import { describe, expect, it } from "vitest";

import type { DocumentBlock } from "../formGeneration";
import {
  addBinding,
  bindingAt,
  codePointOffset,
  manualField,
  mergeFields,
  parseOptions,
  prepareForSave,
  removeBinding,
} from "../reviewEditing";

const block = (id: string, text: string): DocumentBlock => ({
  id,
  kind: "paragraph",
  text,
  path: id,
});

const dateLine = block("body/p:0", "ngày ... tháng ... năm ...");
const other = block("body/p:1", "Ký ngày: ...");

describe("UC-A03 review editing", () => {
  it("converts browser UTF-16 selection offsets to server code-point offsets", () => {
    const text = "😀 Họ tên";

    expect(codePointOffset(text, text.indexOf("Họ"))).toBe(2);
  });

  it("merges blanks in one paragraph into a single covering Binding", () => {
    const candidates = [
      manualField("day", "Ngày", bindingAt(dateLine, 5, 8)),
      manualField("year", "Năm", bindingAt(dateLine, 23, 26)),
    ];

    const merged = mergeFields(candidates, [dateLine], "year", "day");

    expect(merged.map((field) => field.id)).toEqual(["day"]);
    expect(merged[0]?.occurrences.map(({ start, end }) => [start, end])).toEqual([[5, 26]]);
  });

  it("keeps positions in different paragraphs as multiple Bindings of one Field", () => {
    const candidates = [
      manualField("a", "A", bindingAt(dateLine, 5, 8)),
      manualField("b", "B", bindingAt(other, 9, 12)),
    ];

    expect(mergeFields(candidates, [dateLine, other], "b", "a")[0]?.occurrences).toHaveLength(2);
  });

  it("adds and removes Bindings but never leaves a Field without one", () => {
    const one = [manualField("a", "A", bindingAt(dateLine, 5, 8))];
    const two = addBinding(one, "a", bindingAt(other, 9, 12));

    expect(two[0]?.occurrences).toHaveLength(2);
    expect(removeBinding(two, "a", 0)[0]?.occurrences[0]?.block_id).toBe("body/p:1");
    expect(removeBinding(one, "a", 0)[0]?.occurrences).toHaveLength(1);
  });

  it("keeps spaces inside options and drops blank or duplicate lines", () => {
    expect(parseOptions("Có thể\n\n Không \nCó thể\n").map((option) => option.value)).toEqual([
      "Có thể",
      "Không",
    ]);
  });

  it("drops rules that do not apply to the selected Field type", () => {
    const field = manualField("a", " A ", bindingAt(dateLine, 5, 8));
    field.type = "number";
    field.rules = { required: true, min_length: 3, minimum: 0 };
    field.instructions = [{ text: "  " }];

    const [prepared] = prepareForSave([field]);

    expect(prepared?.rules).toEqual({ required: true, minimum: 0 });
    expect(prepared?.label).toBe("A");
    expect(prepared?.instructions).toEqual([]);
  });
});
