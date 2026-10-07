import { useCallback, useState } from 'react'
import { AgentPipeline } from './components/AgentPipeline'
import { Header } from './components/Header'
import { HistoryView } from './components/HistoryView'
import { ReportViewer } from './components/ReportViewer'
import { ResearchForm } from './components/ResearchForm'
import { SettingsView } from './components/SettingsView'
import { Sidebar, type View } from './components/Sidebar'
import { Timeline } from './components/Timeline'
import { clearHistory, loadHistory, saveToHistory } from './history'
import { useHealth } from './hooks/useHealth'
import { useResearch } from './hooks/useResearch'
import type { Job } from './types'

export default function App() {
  const [view, setView] = useState<View>('research')
  const [history, setHistory] = useState<Job[]>(loadHistory)
  const health = useHealth()
  const onFinished = useCallback((j: Job) => setHistory(saveToHistory(j)), [])
  const { job, error, submitting, submit, reset, show } = useResearch(onFinished)

  const blocked =
    health.state === 'offline' ? 'The backend is offline. Start it or check the API URL in Settings.'
    : health.state === 'online' && !health.health.model_configured ? 'The server has no model configured. Set AGENTFORGE_MODEL and AGENTFORGE_API_KEY on the backend.'
    : null

  const active = job !== null && (job.status === 'queued' || job.status === 'running')

  return (
    <div className="shell">
      <Sidebar
        view={view}
        historyCount={history.length}
        onNavigate={setView}
        onNew={() => { reset(); setView('research') }}
      />
      <div className="main">
        <Header health={health} />
        <main>
          {view === 'history' && (
            <HistoryView
              items={history}
              onOpen={j => { show(j); setView('research') }}
              onClear={() => { clearHistory(); setHistory([]) }}
            />
          )}
          {view === 'settings' && <SettingsView health={health} />}
          {view === 'research' && (
            <div className="grid">
              <div className="col">
                {!job && !error && <ResearchForm busy={submitting} blocked={blocked} onSubmit={submit} />}
                {error && (
                  <div className="panel">
                    <h2>Could not complete the request</h2>
                    <p className="notice bad" role="alert">{error}</p>
                    <button type="button" className="secondary" onClick={reset}>Back to the form</button>
                  </div>
                )}
                {job && (
                  <div className="panel question">
                    <span className="field-label">Question</span>
                    <p>{job.question}</p>
                    {!active && <button type="button" className="secondary" onClick={reset}>Ask another question</button>}
                  </div>
                )}
                {active && (
                  <div className="panel empty" role="status" aria-live="polite">
                    <h2>Agents are working</h2>
                    <p>Research can take a few minutes. The report appears here when the Reviewer finishes; live progress is on the right.</p>
                  </div>
                )}
                {job && !active && <ReportViewer job={job} />}
                {!job && !error && (
                  <div className="panel empty">
                    <h2>No research running</h2>
                    <p>Ask a question above. Progress and the final report appear here, using only what the backend actually returns.</p>
                  </div>
                )}
              </div>
              <aside className="col side" aria-label="Run progress">
                <div className="panel">
                  <h2>Agents</h2>
                  <AgentPipeline job={job} />
                </div>
                <div className="panel">
                  <h2>Timeline</h2>
                  <Timeline job={job} />
                </div>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
