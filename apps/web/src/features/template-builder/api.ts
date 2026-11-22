import { apiJson, apiText } from "../../shared/api/http";
import type { FormGeneration, FieldCandidate } from "./types";

export async function uploadTemplate(file: File): Promise<FormGeneration> {
  return apiJson<FormGeneration>("/api/form-generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "X-Filename": encodeURIComponent(file.name),
    },
    body: file,
  });
}

export async function saveGeneration(id: string, revision: number, candidates: FieldCandidate[]): Promise<FormGeneration> {
  return apiJson<FormGeneration>(`/api/form-generations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision, candidates }),
  });
}

export async function sourcePreview(id: string): Promise<string> {
  return apiText(`/api/form-generations/${id}/source-preview`);
}
