import { apiDownload, apiJson } from "../../shared/api/http";
import type {
  DraftEditor,
  DraftSaveRequest,
  DraftSummary,
  ExportFormat,
  ExportPurpose,
  RenderSnapshot,
} from "./types";

export async function createDraft(templateId: number, title: string): Promise<DraftEditor> {
  return apiJson<DraftEditor>(`/api/templates/${templateId}/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function listDrafts(): Promise<DraftSummary[]> {
  return apiJson<DraftSummary[]>("/api/drafts");
}

export async function getDraft(draftId: number): Promise<DraftEditor> {
  return apiJson<DraftEditor>(`/api/drafts/${draftId}`);
}

export async function saveDraft(draftId: number, payload: DraftSaveRequest): Promise<DraftEditor> {
  return apiJson<DraftEditor>(`/api/drafts/${draftId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function requestPreview(draftId: number, expectedVersion: number): Promise<RenderSnapshot> {
  return apiJson<RenderSnapshot>(`/api/drafts/${draftId}/renders/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expected_version: expectedVersion }),
  });
}

export async function exportDraft(
  draftId: number,
  request: { expected_version: number; format: ExportFormat; purpose: ExportPurpose },
) {
  return apiDownload(`/api/drafts/${draftId}/exports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}
