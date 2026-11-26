import { apiDownload, apiJson, apiText } from "../../shared/api/http";
import type {
  ContentCheck,
  CreatePresetTemplateRequest,
  FieldCandidate,
  FormGeneration,
  FormattingPresetOption,
  TemplateDraft,
  TemplateSummary,
} from "./formGeneration";

export async function listAvailablePresets(): Promise<FormattingPresetOption[]> {
  return apiJson<FormattingPresetOption[]>("/api/presets");
}

export async function getTemplate(templateId: number): Promise<TemplateDraft> {
  return apiJson<TemplateDraft>(`/api/templates/${templateId}`);
}

export async function uploadTemplate(file: File): Promise<TemplateDraft> {
  return apiJson<TemplateDraft>("/api/templates/uploaded-docx", {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "X-Filename": file.name,
    },
    body: file,
  });
}

export async function createPresetTemplate(
  request: CreatePresetTemplateRequest,
): Promise<TemplateDraft> {
  return apiJson<TemplateDraft>("/api/templates/from-preset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function saveTemplateReview(
  templateId: number,
  revision: number,
  candidates: FieldCandidate[],
): Promise<TemplateDraft> {
  return apiJson<TemplateDraft>(`/api/templates/${templateId}/field-review`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision, candidates }),
  });
}

export async function publishTemplate(templateId: number): Promise<TemplateDraft> {
  return apiJson<TemplateDraft>(`/api/templates/${templateId}/publish`, { method: "POST" });
}

export async function getTemplateSourcePreview(templateId: number): Promise<string> {
  return apiText(`/api/templates/${templateId}/source-preview`);
}

export async function testCheckTemplate(
  templateId: number,
  values: Record<string, string>,
): Promise<ContentCheck> {
  return apiJson<ContentCheck>(`/api/templates/${templateId}/test-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  return apiJson<TemplateSummary[]>("/api/templates");
}

export async function testFillTemplate(templateId: number, values: Record<string, string>) {
  return apiDownload(`/api/templates/${templateId}/test-fill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

/** Legacy adapter retained temporarily for the existing extraction route. */
export async function saveGeneration(
  id: string,
  revision: number,
  candidates: FieldCandidate[],
): Promise<FormGeneration> {
  return apiJson<FormGeneration>(`/api/form-generations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision, candidates }),
  });
}

/** Legacy adapter retained temporarily for the existing extraction route. */
export async function sourcePreview(id: string): Promise<string> {
  return apiText(`/api/form-generations/${id}/source-preview`);
}
