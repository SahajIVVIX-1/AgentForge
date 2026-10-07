import { useCallback, useEffect, useRef, useState } from 'react'
import { getJob, startResearch } from '../api'
import type { Job, ResearchRequest } from '../types'

const POLL_MS = 1500
const MAX_POLL_FAILURES = 5

export function useResearch(onFinished: (job: Job) => void) {
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runId = useRef(0)
  const finishedCb = useRef(onFinished)
  useEffect(() => { finishedCb.current = onFinished }, [onFinished])

  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
  useEffect(() => () => { runId.current++; stop() }, [])

  const poll = useCallback((id: string, mine: number) => {
    function schedule(failures: number) {
      timer.current = setTimeout(async () => {
        if (mine !== runId.current) return
        try {
          const next = await getJob(id)
          if (mine !== runId.current) return
          setJob(next)
          if (next.status === 'succeeded' || next.status === 'failed') {
            setSubmitting(false)
            finishedCb.current(next)
            return
          }
          schedule(0)
        } catch (e) {
          if (mine !== runId.current) return
          if (failures + 1 >= MAX_POLL_FAILURES) {
            setSubmitting(false)
            setError(`Lost contact with the backend: ${e instanceof Error ? e.message : 'unknown error'}`)
            return
          }
          schedule(failures + 1)
        }
      }, POLL_MS)
    }
    schedule(0)
  }, [])

  const submit = useCallback(async (req: ResearchRequest) => {
    if (submitting) return // prevents duplicate submissions
    stop()
    const mine = ++runId.current
    setSubmitting(true); setError(null); setJob(null)
    try {
      const created = await startResearch(req)
      if (mine !== runId.current) return
      setJob(created)
      poll(created.id, mine)
    } catch (e) {
      setSubmitting(false)
      setError(e instanceof Error ? e.message : 'Could not start the research run.')
    }
  }, [submitting, poll])

  const reset = useCallback(() => {
    runId.current++; stop(); setJob(null); setError(null); setSubmitting(false)
  }, [])

  const show = useCallback((j: Job) => {
    runId.current++; stop(); setJob(j); setError(null); setSubmitting(false)
  }, [])

  return { job, error, submitting, submit, reset, show }
}
