export interface StudioApiErrorBody {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly details?: unknown;
  };
}

export class StudioApiError extends Error {
  readonly code: string;
  readonly details: unknown;

  constructor(message: string, code = "internal", details: unknown = null) {
    super(message);
    this.name = "StudioApiError";
    this.code = code;
    this.details = details;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  let body: unknown = null;
  const text = await response.text();
  if (text.length > 0) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const failure = body as StudioApiErrorBody | null;
    throw new StudioApiError(
      failure?.error?.message ?? `Request failed with HTTP ${response.status}.`,
      failure?.error?.code ?? "internal",
      failure?.error?.details ?? null,
    );
  }
  return body as T;
}

export async function studioFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { cache: "no-store", ...init });
  return parseResponse<T>(response);
}

export async function studioPostJson<T>(input: string, body: unknown): Promise<T> {
  return studioFetch<T>(input, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function studioPatchJson<T>(input: string, body: unknown): Promise<T> {
  return studioFetch<T>(input, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function studioUpload<T>(input: string, form: FormData): Promise<T> {
  return studioFetch<T>(input, { method: "POST", body: form });
}
