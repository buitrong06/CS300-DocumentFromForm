import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { TemplateImportPage } from "../TemplateImportPage";

describe("TemplateImportPage", () => {
  it("renders the live canonical Template creation choices", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/templates/new"]}>
        <TemplateImportPage />
      </MemoryRouter>,
    );

    expect(html).toContain("UC-A02");
    expect(html).toContain("Tải DOCX");
    expect(html).toContain("Tạo từ Preset");
    expect(html).toContain("Chọn tệp DOCX");
  });
});
