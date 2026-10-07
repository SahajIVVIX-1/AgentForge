import type { AgentName, Job } from './types'

export type AgentState = 'waiting' | 'running' | 'done' | 'failed'
export const AGENT_IDS: AgentName[] = ['researcher', 'analyst', 'reviewer']

export function agentStates(job: Job | null): Record<AgentName, AgentState> {
  const s: Record<AgentName, AgentState> = { researcher: 'waiting', analyst: 'waiting', reviewer: 'waiting' }
  if (!job) return s
  for (const e of job.events) {
    if (!e.agent) continue
    if (e.kind === 'agent_started') s[e.agent] = 'running'
    if (e.kind === 'agent_finished') s[e.agent] = 'done'
  }
  if (job.status === 'failed') {
    for (const id of AGENT_IDS) if (s[id] === 'running') s[id] = 'failed'
  }
  return s
}
