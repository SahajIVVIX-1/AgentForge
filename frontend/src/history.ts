import type { Job } from './types'

const KEY = 'agentforge.history.v1'
const MAX = 20

export function loadHistory(): Job[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Job[]) : []
  } catch {
    return []
  }
}

export function saveToHistory(job: Job): Job[] {
  const next = [job, ...loadHistory().filter(j => j.id !== job.id)].slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage full or blocked */ }
  return next
}

export function clearHistory() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
