import type { ConnectionStatus } from './RoomClient'

const MESSAGES: Record<Exclude<ConnectionStatus, 'connected'>, string> = {
  connecting: 'Conectando ao servidor…',
  reconnecting: 'Conexão perdida. Reconectando…',
  disconnected: 'Você está desconectado.',
}

type ConnectionBannerProps = {
  status: ConnectionStatus
  onReconnect: () => void
}

export function ConnectionBanner({ status, onReconnect }: ConnectionBannerProps) {
  if (status === 'connected') {
    return null
  }

  return (
    <div className={`status-banner ${status}`} role="status" aria-live="polite">
      <span>{MESSAGES[status]}</span>
      {status === 'disconnected' ? (
        <button type="button" className="link-button" onClick={onReconnect}>
          Tentar de novo
        </button>
      ) : null}
    </div>
  )
}
