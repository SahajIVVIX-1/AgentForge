import { useEffect, useState } from 'react'
import { getHealth } from '../api'
import type { Health } from '../types'

export type HealthState =
  | { state: 'checking' }
  | { state: 'offline'; message: string }
  | { state: 'online'; health: Health }

export function useHealth(intervalMs = 20000): HealthState {
  const [value, setValue] = useState<HealthState>({ state: 'checking' })
  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const health = await getHealth()
        if (alive) setValue({ state: 'online', health })
      } catch (e) {
        if (alive) setValue({ state: 'offline', message: e instanceof Error ? e.message : 'Unreachable' })
      }
    }
    check()
    const id = setInterval(check, intervalMs)
    return () => { alive = false; clearInterval(id) }
  }, [intervalMs])
  return value
}
