import type { ConnectionStatus } from './RoomClient'

const MESSAGES: Record<Exclude<ConnectionStatus, 'connected'>, string> = {
  connecting: 'Connecting to the server…',
  reconnecting: 'Connection lost. Reconnecting…',
  disconnected: 'You are disconnected.',
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
          Try again
        </button>
      ) : null}
    </div>
  )
}
