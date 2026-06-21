const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class RequestTimeoutError extends Error {
  constructor(
    public operation: string,
    public timeoutMs: number,
  ) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
  }
}

export const apiUrl = (path: string) => `${API}${path}`;
export const authToken = () => localStorage.getItem("voiceturk.access_token");
export const authHeaders = (): Record<string, string> =>
  authToken() ? { Authorization: `Bearer ${authToken()}` } : {};

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  operation: string,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as DOMException).name === "AbortError")
      throw new RequestTimeoutError(operation, timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 15000,
  operation = path,
): Promise<T> {
  const response = await fetchWithTimeout(
    apiUrl(path),
    {
      ...(init ?? {}),
      headers: { ...authHeaders(), ...(init?.headers ?? {}) },
    },
    timeoutMs,
    operation,
  );
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    if (response.status === 401 && !path.startsWith("/auth/"))
      localStorage.removeItem("voiceturk.access_token");
    throw new Error(error.message ?? "Request failed");
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});
