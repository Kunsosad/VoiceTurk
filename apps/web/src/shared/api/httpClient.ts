const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export class RequestTimeoutError extends Error {
  constructor(public operation: string, public timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`)
    this.name = 'RequestTimeoutError'
  }
}

export const apiUrl = (path: string) => `${API}${path}`

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, operation: string) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {...init, signal: controller.signal})
  } catch (error) {
    if ((error as DOMException).name === 'AbortError') throw new RequestTimeoutError(operation, timeoutMs)
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function request<T>(path: string, init?: RequestInit, timeoutMs = 15000, operation = path): Promise<T> {
  const response = await fetchWithTimeout(apiUrl(path), init ?? {}, timeoutMs, operation)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message ?? 'Request failed')
  }
  return response.json()
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
})
