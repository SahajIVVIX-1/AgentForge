import type { Health, Job, ResearchRequest } from './types'

export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
    if (!res.ok) {
      let detail = res.statusText
      try {
        const body = await res.json()
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? body)
      } catch { /* non-JSON error body */ }
      throw new ApiError(detail || `Request failed (${res.status})`, res.status)
    }
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('The backend did not respond in time.')
    }
    throw new ApiError('Cannot reach the backend. Check that it is running and the API URL is correct.')
  } finally {
    clearTimeout(timer)
  }
}

export const getHealth = () => request<Health>('/health', {}, 8000)
export const startResearch = (body: ResearchRequest) =>
  request<Job>('/api/research', { method: 'POST', body: JSON.stringify(body) })
export const getJob = (id: string) => request<Job>(`/api/research/${id}`)
