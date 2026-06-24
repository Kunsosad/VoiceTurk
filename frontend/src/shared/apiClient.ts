import { safeStorage } from './safeStorage';

const TOKEN_KEY = 'voiceturk_api_token';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: { code: string; message: string; details?: unknown } };

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiToken = {
  get: () => safeStorage.getItem(TOKEN_KEY),
  set: (token: string) => safeStorage.setItem(TOKEN_KEY, token),
  clear: () => safeStorage.removeItem(TOKEN_KEY),
};

export async function apiRequest<T>(path: string, options: { method?: string; body?: unknown; formData?: FormData; signal?: AbortSignal } = {}): Promise<T> {
  const headers = new Headers();
  const token = apiToken.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!options.formData && options.body !== undefined) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET', headers,
      body: options.formData ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      signal: options.signal,
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Unable to reach the VoiceTurk API', 0);
  }

  let payload: ApiSuccess<T> | ApiFailure;
  try {
    payload = await response.json() as ApiSuccess<T> | ApiFailure;
  } catch {
    throw new ApiError('INVALID_RESPONSE', 'VoiceTurk API returned an invalid response', response.status);
  }
  if ('error' in payload) {
    throw new ApiError(payload.error.code, payload.error.message, response.status, payload.error.details);
  }
  if (!response.ok) {
    throw new ApiError('HTTP_ERROR', 'VoiceTurk API request failed', response.status);
  }
  return payload.data;
}

export function apiAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}
