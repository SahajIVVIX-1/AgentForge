import { describe, expect, it } from 'vitest'
import { agentStates } from './agentState'
import { toMarkdownFile } from './report'
import type { Job } from './types'

const base: Job = {
  id: 'abcdef123456', status: 'running', question: 'What is RAG?', created_at: '2026-01-01T00:00:00Z',
  finished_at: null, events: [], result: null, error: null,
}
const ev = (agent: Job['events'][number]['agent'], kind: string) => ({ at: '2026-01-01T00:00:00Z', agent, kind, message: kind })

describe('agentStates', () => {
  it('shows everything waiting when there is no job', () => {
    expect(agentStates(null)).toEqual({ researcher: 'waiting', analyst: 'waiting', reviewer: 'waiting' })
  })
  it('derives state only from real events', () => {
    const job = { ...base, events: [ev('researcher', 'agent_started'), ev('researcher', 'agent_finished'), ev('analyst', 'agent_started')] }
    expect(agentStates(job)).toEqual({ researcher: 'done', analyst: 'running', reviewer: 'waiting' })
  })
  it('marks the running agent as failed when the job fails', () => {
    const job: Job = { ...base, status: 'failed', events: [ev('researcher', 'agent_started')] }
    expect(agentStates(job).researcher).toBe('failed')
  })
})

describe('toMarkdownFile', () => {
  const result = {
    summary: 's', findings: [], limitations: [], failed_checks: ['no_sources_retrieved'],
    report_markdown: '# Body', structured: true, sources: [{ url: 'https://example.org', title: 'Ex', how: 'fetched' as const }],
  }
  it('includes question, failed checks and sources', () => {
    const md = toMarkdownFile({ ...base, status: 'succeeded', result })
    expect(md).toContain('# What is RAG?')
    expect(md).toContain('- no_sources_retrieved')
    expect(md).toContain('[Ex](https://example.org) (page read)')
  })
  it('says so when no sources were retrieved', () => {
    expect(toMarkdownFile({ ...base, result: { ...result, sources: [], failed_checks: [] } })).toContain('None retrieved')
  })
})
