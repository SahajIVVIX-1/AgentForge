import type { Job } from '../types'

export function Timeline({ job }: { job: Job | null }) {
  if (!job || job.events.length === 0) {
    return <p className="muted">Events from the backend will appear here as the agents work.</p>
  }
  return (
    <ul className="timeline" aria-label="Backend events">
      {job.events.map((e, i) => (
        <li key={i} className={e.kind === 'error' ? 'err' : ''}>
          <time dateTime={e.at}>{new Date(e.at).toLocaleTimeString()}</time>
          <span>{e.agent && !e.message.toLowerCase().startsWith(e.agent) ? `${e.agent[0].toUpperCase()}${e.agent.slice(1)}: ` : ''}{e.message}</span>
        </li>
      ))}
    </ul>
  )
}
