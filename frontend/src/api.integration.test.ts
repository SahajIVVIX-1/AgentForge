// Runs only when INTEGRATION_API_URL points at a live backend (see README "Testing").
import { describe, expect, it } from 'vitest'

const BASE = process.env.INTEGRATION_API_URL
const run = BASE ? describe : describe.skip

run('API integration', () => {
  it('health, validation, job lifecycle', async () => {
    const health = await (await fetch(`${BASE}/health`)).json()
    expect(health.status).toBe('ok')

    const bad = await fetch(`${BASE}/api/research`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'hi' }),
    })
    expect(bad.status).toBe(422)

    const created = await fetch(`${BASE}/api/research`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'What are the trade-offs of multi-agent systems?', depth: 'quick', require_sources: true }),
    })
    expect(created.status).toBe(202)
    const { id } = await created.json()

    let job
    for (let i = 0; i < 60; i++) {
      job = await (await fetch(`${BASE}/api/research/${id}`)).json()
      if (job.status === 'succeeded' || job.status === 'failed') break
      await new Promise(r => setTimeout(r, 500))
    }
    expect(job.status).toBe('succeeded')
    expect(job.result.sources.length).toBeGreaterThan(0)
    expect(job.events.some((e: { kind: string }) => e.kind === 'job_finished')).toBe(true)
  }, 60000)
})
