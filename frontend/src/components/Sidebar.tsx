export type View = 'research' | 'history' | 'settings'

const GITHUB_URL: string = import.meta.env.VITE_GITHUB_URL ?? 'https://github.com/'

interface Props { view: View; historyCount: number; onNavigate: (v: View) => void; onNew: () => void }

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <path d="M6 7l7 6M6 19l7-6M13 13h8" stroke="#7c83f5" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="6" cy="7" r="3" fill="#7c83f5" />
      <circle cx="6" cy="19" r="3" fill="#7c83f5" opacity=".6" />
      <circle cx="21" cy="13" r="3" fill="#e7e8ec" />
    </svg>
  )
}

export function Sidebar({ view, historyCount, onNavigate, onNew }: Props) {
  const item = (v: View, label: string, onClick: () => void, badge?: number) => (
    <button
      type="button"
      className={`nav-item${view === v ? ' active' : ''}`}
      aria-current={view === v ? 'page' : undefined}
      onClick={onClick}
    >
      {label}
      {badge ? <span className="badge">{badge}</span> : null}
    </button>
  )
  return (
    <aside className="sidebar">
      <div className="brand"><Mark /><span>AgentForge</span></div>
      <nav aria-label="Primary">
        {item('research', 'New research', onNew)}
        {item('history', 'Research history', () => onNavigate('history'), historyCount)}
        {item('settings', 'Settings', () => onNavigate('settings'))}
      </nav>
      <div className="about">
        <p>A multi-agent research assistant. A Researcher gathers evidence, an Analyst interprets it, and a Reviewer audits the report.</p>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">View source on GitHub</a>
      </div>
    </aside>
  )
}
