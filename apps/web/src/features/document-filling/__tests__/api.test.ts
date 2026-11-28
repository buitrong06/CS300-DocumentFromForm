import { afterEach, describe, expect, it, vi } from "vitest";

import { createDraft, exportDraft, requestPreview, saveDraft } from "../api";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("canonical Draft API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates and autosaves a Draft using its expected version", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ draft: { id: 3, version: 1 } }, 201))
      .mockResolvedValueOnce(jsonResponse({ draft: { id: 3, version: 2 } }));
    vi.stubGlobal("fetch", fetch);

    await createDraft(8, "Tờ trình tháng 11");
    await saveDraft(3, { expected_version: 1, field_values: { trich_yeu: "Nội dung" } });

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/api/templates/8/drafts",
      "http://localhost:8000/api/drafts/3",
    ]);
    expect(fetch.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          expected_version: 1,
          field_values: { trich_yeu: "Nội dung" },
        }),
      }),
    );
  });

  it("surfaces a deterministic export-gate finding from a structured API error", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          detail: {
            findings: [{ status: "failed", message: "Ngày ký là bắt buộc." }],
            gate: { final_export_allowed: false },
          },
        },
        422,
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(
      exportDraft(3, { expected_version: 1, format: "pdf", purpose: "final_export" }),
    ).rejects.toMatchObject({ status: 422, message: "Ngày ký là bắt buộc." });
  });

  it("requests preview and downloads typed exports", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 10, content_url: "/api/render-snapshots/10/content" }))
      .mockResolvedValueOnce(
        new Response("PDF", {
          headers: {
            "Content-Disposition": "attachment; filename*=UTF-8''to-trinh-final.pdf",
          },
        }),
      );
    vi.stubGlobal("fetch", fetch);

    await requestPreview(3, 2);
    const exportResult = await exportDraft(3, {
      expected_version: 2,
      format: "pdf",
      purpose: "final_export",
    });

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/api/drafts/3/renders/preview",
      "http://localhost:8000/api/drafts/3/exports",
    ]);
    expect(exportResult.filename).toBe("to-trinh-final.pdf");
  });
});
