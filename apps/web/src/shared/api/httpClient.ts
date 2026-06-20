const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const apiUrl = (path: string) => `${API}${path}`

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message ?? 'Request failed')
  }
  return response.json()
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
})
