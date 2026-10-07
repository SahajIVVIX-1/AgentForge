import type { HealthState } from '../hooks/useHealth'

export function Header({ health }: { health: HealthState }) {
  const backend =
    health.state === 'checking' ? { cls: 'pending', text: 'Checking backend' }
    : health.state === 'offline' ? { cls: 'bad', text: 'Backend offline' }
    : { cls: 'ok', text: 'Backend connected' }
  const model =
    health.state !== 'online' ? { cls: 'pending', text: 'Model unknown' }
    : health.health.model_configured ? { cls: 'ok', text: health.health.model }
    : { cls: 'bad', text: 'Model not configured' }
  return (
    <header className="header">
      <h1>Research workspace</h1>
      <div className="pills" role="status" aria-live="polite">
        <span className={`pill ${backend.cls}`}><i />{backend.text}</span>
        <span className={`pill ${model.cls}`}><i />{model.text}</span>
      </div>
    </header>
  )
}
