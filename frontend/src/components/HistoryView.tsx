import type { Job } from '../types'

interface Props { items: Job[]; onOpen: (j: Job) => void; onClear: () => void }

export function HistoryView({ items, onOpen, onClear }: Props) {
  if (items.length === 0) {
    return <div className="panel empty"><h2>No research yet</h2><p>Finished runs are saved in this browser so you can reopen them here.</p></div>
  }
  return (
    <div className="panel">
      <div className="report-head">
        <h2>Research history</h2>
        <button type="button" className="secondary" onClick={onClear}>Clear history</button>
      </div>
      <ul className="history">
        {items.map(j => (
          <li key={j.id}>
            <button type="button" onClick={() => onOpen(j)}>
              <span>{j.question}</span>
              <small>{j.status === 'succeeded' ? 'Succeeded' : 'Failed'} · {new Date(j.created_at).toLocaleString()}</small>
            </button>
          </li>
        ))}
      </ul>
      <p className="muted">Stored only in this browser. The server keeps jobs in memory and forgets them on restart.</p>
    </div>
  )
}
