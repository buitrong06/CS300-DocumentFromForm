import { describe, expect, it } from "vitest";

import { canExportPersistedDraft, hasUnsavedDraftEdits, isRetryableSaveStatus, saveRetryDelayMs, isRealEdit } from "../state";

describe("Draft editor state", () => {
  it("detects local values that have not reached the persisted Draft", () => {
    expect(hasUnsavedDraftEdits({ trich_yeu: "Mới" }, { trich_yeu: "Cũ" })).toBe(true);
    expect(hasUnsavedDraftEdits({ trich_yeu: "Mới" }, { trich_yeu: "Mới" })).toBe(false);
  });

  it("compares field maps by keys and values instead of insertion order", () => {
    expect(
      hasUnsavedDraftEdits(
        { trich_yeu: "Nội dung", kinh_gui: "Ban Giám hiệu" },
        { kinh_gui: "Ban Giám hiệu", trich_yeu: "Nội dung" },
      ),
    ).toBe(false);
  });

  it("does not allow export until the visible values are persisted", () => {
    expect(canExportPersistedDraft("saved", { trich_yeu: "Đã lưu" }, { trich_yeu: "Đã lưu" })).toBe(true);
    expect(canExportPersistedDraft("unsaved", { trich_yeu: "Mới" }, { trich_yeu: "Cũ" })).toBe(false);
    expect(canExportPersistedDraft("saved", { trich_yeu: "Mới" }, { trich_yeu: "Cũ" })).toBe(false);
    expect(canExportPersistedDraft("conflict", { trich_yeu: "Mới" }, { trich_yeu: "Mới" })).toBe(false);
  });
});

describe("autosave retry (UC-A06 A3)", () => {
  it("retries network and server failures but not rejected values or conflicts", () => {
    expect([null, 500, 503, 429].every(isRetryableSaveStatus)).toBe(true);
    expect([409, 422, 403, 404].some(isRetryableSaveStatus)).toBe(false);
  });

  it("backs off exponentially up to thirty seconds", () => {
    expect([1, 2, 3, 10].map(saveRetryDelayMs)).toEqual([2000, 4000, 8000, 30000]);
  });
});

describe("editor change events", () => {
  it("ignores events that leave the value unchanged, so opening a Draft never saves it", () => {
    expect(isRealEdit({ body: "{\"type\":\"doc\"}" }, "body", "{\"type\":\"doc\"}")).toBe(false);
    expect(isRealEdit({}, "body", "")).toBe(false);
  });

  it("keeps real edits, including clearing a value", () => {
    expect(isRealEdit({}, "body", "a")).toBe(true);
    expect(isRealEdit({ body: "a" }, "body", "")).toBe(true);
  });
});
