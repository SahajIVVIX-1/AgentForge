import type { Job } from './types'

export function toMarkdownFile(job: Job): string {
  const r = job.result!
  const parts = [`# ${job.question}`, '', r.report_markdown.trim()]
  if (r.failed_checks.length) parts.push('', '## Failed checks', ...r.failed_checks.map(c => `- ${c}`))
  parts.push('', '## Sources', ...(r.sources.length
    ? r.sources.map(s => `- [${s.title || s.url}](${s.url}) (${s.how === 'fetched' ? 'page read' : 'search result only'})`)
    : ['- None retrieved']))
  return parts.join('\n')
}
