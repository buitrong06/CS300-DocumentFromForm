import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DraftEditorPage } from "../DraftEditorPage";

describe("DraftEditorPage", () => {
  it("renders a clear loading state for the canonical Draft route", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/drafts/42"]}>
        <Routes>
          <Route path="/drafts/:draftId" element={<DraftEditorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Đang tải Bản nháp…");
    expect(html).toContain("UC-A06 · Điền biểu mẫu");
  });
});
