import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPresetTemplate,
  getTemplateSourcePreview,
  listAvailablePresets,
  publishTemplate,
  saveTemplateReview,
  uploadTemplate,
} from "../api";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("canonical Template authoring API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uploads DOCX to the canonical Template endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ id: 7 }, 201));
    vi.stubGlobal("fetch", fetch);

    await uploadTemplate(
      new File(["DOCX"], "mau.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/templates/uploaded-docx",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Filename": "mau.docx" }),
      }),
    );
  });

  it("uses canonical review, preset, publication, and preview routes", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ id: 1, name: "ND30" }]))
      .mockResolvedValueOnce(jsonResponse({ id: 2 }, 201))
      .mockResolvedValueOnce(jsonResponse({ id: 2 }))
      .mockResolvedValueOnce(jsonResponse({ id: 2 }))
      .mockResolvedValueOnce(new Response("<article>preview</article>"));
    vi.stubGlobal("fetch", fetch);

    await listAvailablePresets();
    await createPresetTemplate({
      preset_id: 1,
      document_type_key: "to_trinh",
      name: "Tờ trình",
      org_constants: { issuing_org: "Khoa CNTT" },
    });
    await saveTemplateReview(2, 1, []);
    await publishTemplate(2);
    await getTemplateSourcePreview(2);

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/api/presets",
      "http://localhost:8000/api/templates/from-preset",
      "http://localhost:8000/api/templates/2/field-review",
      "http://localhost:8000/api/templates/2/publish",
      "http://localhost:8000/api/templates/2/source-preview",
    ]);
  });
});
