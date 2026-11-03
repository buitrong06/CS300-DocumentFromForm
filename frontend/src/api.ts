import type { FormGeneration, FieldCandidate } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function read<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(body.detail ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export async function uploadTemplate(file: File): Promise<FormGeneration> {
  return read<FormGeneration>(await fetch(`${API_BASE}/api/form-generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "X-Filename": encodeURIComponent(file.name),
    },
    body: file,
  }));
}

export async function saveGeneration(id: string, revision: number, candidates: FieldCandidate[]): Promise<FormGeneration> {
  return read<FormGeneration>(await fetch(`${API_BASE}/api/form-generations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision, candidates }),
  }));
}

export async function sourcePreview(id: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/form-generations/${id}/source-preview`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Could not render the source document" }));
    throw new Error(body.detail ?? "Could not render the source document");
  }
  return response.text();
}

