export type Depth = 'quick' | 'standard' | 'deep'
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'
export type AgentName = 'researcher' | 'analyst' | 'reviewer'

export interface ResearchEvent {
  at: string
  agent: AgentName | null
  kind: string
  message: string
}
export interface Source { url: string; title: string; how: 'search' | 'fetched' }
export interface ResearchResult {
  summary: string
  findings: string[]
  limitations: string[]
  failed_checks: string[]
  report_markdown: string
  sources: Source[]
  structured: boolean
}
export interface Job {
  id: string
  status: JobStatus
  question: string
  created_at: string
  finished_at: string | null
  events: ResearchEvent[]
  result: ResearchResult | null
  error: string | null
}
export interface Health { status: string; model: string; model_configured: boolean }
export interface ResearchRequest { question: string; depth: Depth; require_sources: boolean }
