import { useState } from 'react'
import type { Depth, ResearchRequest } from '../types'

const EXAMPLES = [
  'What are the main trade-offs between multi-agent and single-agent LLM systems?',
  'How does retrieval-augmented generation reduce hallucinations, and where does it fall short?',
  'What evidence exists on the productivity impact of AI coding assistants?',
]
const DEPTHS: { id: Depth; label: string; hint: string }[] = [
  { id: 'quick', label: 'Quick', hint: 'Few searches' },
  { id: 'standard', label: 'Standard', hint: 'Balanced' },
  { id: 'deep', label: 'Deep', hint: 'More sources, slower' },
]

interface Props { busy: boolean; blocked: string | null; onSubmit: (r: ResearchRequest) => void }

export function ResearchForm({ busy, blocked, onSubmit }: Props) {
  const [question, setQuestion] = useState('')
  const [depth, setDepth] = useState<Depth>('standard')
  const [requireSources, setRequireSources] = useState(true)
  const trimmed = question.trim().replace(/\s+/g, ' ')
  const tooShort = trimmed.length > 0 && trimmed.length < 10
  const valid = trimmed.length >= 10 && trimmed.length <= 1000
  const disabled = busy || !valid || !!blocked

  return (
    <form className="panel form" onSubmit={e => { e.preventDefault(); if (!disabled) onSubmit({ question: trimmed, depth, require_sources: requireSources }) }}>
      <label htmlFor="q" className="field-label">Research question</label>
      <textarea
        id="q" rows={4} maxLength={1000} value={question} disabled={busy}
        placeholder="Ask something that can be answered with sources…"
        onChange={e => setQuestion(e.target.value)}
        aria-describedby="q-help"
        aria-invalid={tooShort}
      />
      <div id="q-help" className={`help${tooShort ? ' warn' : ''}`}>
        {tooShort ? 'Use at least 10 characters.' : `${trimmed.length}/1000`}
      </div>

      <div className="examples" aria-label="Example questions">
        {EXAMPLES.map(ex => (
          <button type="button" key={ex} className="chip" disabled={busy} onClick={() => setQuestion(ex)}>{ex}</button>
        ))}
      </div>

      <fieldset className="options" disabled={busy}>
        <legend className="field-label">Report depth</legend>
        <div className="seg">
          {DEPTHS.map(d => (
            <label key={d.id} className={depth === d.id ? 'on' : ''}>
              <input type="radio" name="depth" value={d.id} checked={depth === d.id} onChange={() => setDepth(d.id)} />
              <span>{d.label}</span><small>{d.hint}</small>
            </label>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={requireSources} onChange={e => setRequireSources(e.target.checked)} />
          Fail the run if no sources are retrieved
        </label>
      </fieldset>

      {blocked && <p className="notice bad" role="alert">{blocked}</p>}
      <button type="submit" className="primary" disabled={disabled}>
        {busy ? 'Running agents…' : 'Run research'}
      </button>
    </form>
  )
}
