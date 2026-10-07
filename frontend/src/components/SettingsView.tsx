import { API_BASE } from '../api'
import type { HealthState } from '../hooks/useHealth'

export function SettingsView({ health }: { health: HealthState }) {
  return (
    <div className="panel">
      <h2>Settings</h2>
      <dl className="kv">
        <dt>API base URL</dt><dd><code>{API_BASE}</code></dd>
        <dt>Backend</dt><dd>{health.state === 'online' ? 'Connected' : health.state === 'offline' ? health.message : 'Checking…'}</dd>
        <dt>Model</dt><dd>{health.state === 'online' ? <code>{health.health.model}</code> : 'Unknown'}</dd>
        <dt>Model credentials</dt><dd>{health.state === 'online' ? (health.health.model_configured ? 'Configured on the server' : 'Missing on the server') : 'Unknown'}</dd>
      </dl>
      <p className="muted">The API URL is set with <code>VITE_API_BASE_URL</code> at build time. Model and credentials are configured on the backend only; the browser never sees an API key.</p>
    </div>
  )
}
