import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "../App";

describe("application shell", () => {
  it("owns top-level routes without importing feature internals eagerly", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/templates/import"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(html).toContain("Tạo Mẫu biểu");
    expect(html).toContain("Prototype PA02 (mock)");
  });
});
