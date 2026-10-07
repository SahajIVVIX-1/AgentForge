import { agentStates, type AgentState } from '../agentState'
import type { AgentName, Job } from '../types'

const AGENTS: { id: AgentName; name: string; role: string }[] = [
  { id: 'researcher', name: 'Researcher', role: 'Searches the web and reads pages' },
  { id: 'analyst', name: 'Analyst', role: 'Separates evidence from interpretation' },
  { id: 'reviewer', name: 'Reviewer', role: 'Audits claims and writes the report' },
]

const LABEL: Record<AgentState, string> = { waiting: 'Waiting', running: 'Working', done: 'Finished', failed: 'Failed' }

export function AgentPipeline({ job }: { job: Job | null }) {
  const states = agentStates(job)
  const lastTool = [...(job?.events ?? [])].reverse().find(e => e.kind === 'tool_call')
  return (
    <ol className="pipeline" aria-label="Agent activity">
      {AGENTS.map(a => (
        <li key={a.id} className={`agent ${states[a.id]}`}>
          <span className="node" aria-hidden="true" />
          <div className="agent-body">
            <div className="agent-top">
              <strong>{a.name}</strong>
              <span className="state">{LABEL[states[a.id]]}</span>
            </div>
            <p>{a.role}</p>
            {a.id === 'researcher' && states.researcher === 'running' && lastTool && (
              <p className="live">{lastTool.message}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
