import ReactMarkdown from 'react-markdown'
import { toMarkdownFile } from '../report'
import type { Job } from '../types'

function download(job: Job) {
  const blob = new Blob([toMarkdownFile(job)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `agentforge-report-${job.id.slice(0, 8)}.md`
  a.click()
  URL.revokeObjectURL(url)
}

const List = ({ items }: { items: string[] }) => (
  <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
)

export function ReportViewer({ job }: { job: Job }) {
  const r = job.result
  if (job.status === 'failed') {
    return (
      <section className="panel report" aria-live="polite">
        <h2>Run failed</h2>
        <p className="notice bad" role="alert">{job.error ?? 'The run failed for an unknown reason.'}</p>
        {r && <p className="muted">A partial report was produced but is not shown as a success. Failed checks: {r.failed_checks.join(', ') || 'none listed'}.</p>}
      </section>
    )
  }
  if (!r) return null
  return (
    <section className="panel report" aria-label="Final report">
      <div className="report-head">
        <h2>Report</h2>
        <button type="button" className="secondary" onClick={() => download(job)}>Download Markdown</button>
      </div>
      {!r.structured && <p className="notice warn">The Reviewer did not return structured output, so the sections below are limited to the raw report.</p>}
      {r.failed_checks.length > 0 && (
        <div className="notice warn"><strong>Failed checks</strong><List items={r.failed_checks} /></div>
      )}
      {r.summary && (<><h3>Summary</h3><p>{r.summary}</p></>)}
      {r.findings.length > 0 && (<><h3>Findings</h3><List items={r.findings} /></>)}
      <h3>Full report</h3>
      <div className="md"><ReactMarkdown>{r.report_markdown}</ReactMarkdown></div>
      <h3>Evidence</h3>
      {r.sources.length === 0 ? <p className="muted">No sources were retrieved.</p> : (
        <ul className="sources">
          {r.sources.map(s => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer noopener">{s.title || s.url}</a>
              <small>{s.how === 'fetched' ? 'Page read' : 'Search result only'}</small>
            </li>
          ))}
        </ul>
      )}
      {r.limitations.length > 0 && (<><h3>Limitations</h3><List items={r.limitations} /></>)}
    </section>
  )
}
