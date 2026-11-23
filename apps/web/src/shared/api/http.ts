const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

interface ErrorBody {
  detail?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function errorFrom(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  return new ApiError(body.detail ?? "Request failed", response.status);
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) throw await errorFrom(response);
  return response.json() as Promise<T>;
}

export async function apiText(path: string, init?: RequestInit): Promise<string> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) throw await errorFrom(response);
  return response.text();
}
