export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

interface ErrorBody {
  detail?: unknown;
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
  return new ApiError(errorMessage(body.detail), response.status);
}

function errorMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI request-validation errors.
    const messages = detail
      .map((item) => (item as { msg?: unknown }).msg)
      .filter((message): message is string => typeof message === "string");
    if (messages.length) return messages.join(" ");
  }
  if (typeof detail === "object" && detail !== null && "findings" in detail) {
    const findings = (detail as { findings?: unknown }).findings;
    if (Array.isArray(findings)) {
      const firstFailed = findings.find(
        (finding): finding is { status?: unknown; message?: unknown } =>
          typeof finding === "object" && finding !== null && (finding as { status?: unknown }).status === "failed",
      );
      if (typeof firstFailed?.message === "string") return firstFailed.message;
    }
  }
  return "Request failed";
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

export interface ApiDownload {
  blob: Blob;
  filename: string | null;
  headers: Headers;
}

function filenameFrom(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const utf8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  const fallback = contentDisposition.match(/filename="?([^";]+)"?/i);
  return fallback?.[1] ?? null;
}

export async function apiDownload(path: string, init?: RequestInit): Promise<ApiDownload> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) throw await errorFrom(response);
  return {
    blob: await response.blob(),
    filename: filenameFrom(response.headers.get("Content-Disposition")),
    headers: response.headers,
  };
}

export function apiUrl(path: string): string {
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${API_BASE}${path}`;
}
