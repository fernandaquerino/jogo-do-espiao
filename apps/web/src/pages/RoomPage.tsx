import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConnectionBanner } from '../online/ConnectionBanner'
import { JoinForm } from '../online/screens/JoinForm'
import { LobbyScreen } from '../online/screens/LobbyScreen'
import { OnlineResultScreen } from '../online/screens/OnlineResultScreen'
import { OnlineRoundScreen } from '../online/screens/OnlineRoundScreen'
import { useRoomClient, useRoomState } from '../online/useRoomClient'

const LEFT_MESSAGES = {
  kicked: 'You were removed from the room by the host.',
  left: 'You left the room.',
  expired: 'Your seat in the room expired or the room no longer exists.',
} as const

export function RoomPage() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const client = useRoomClient()
  const state = useRoomState()

  useEffect(() => {
    client.enterRoom(roomCode)
  }, [client, roomCode])

  const inThisRoom = state.you !== null && state.roomCode === roomCode && state.room !== null
  const banner = <ConnectionBanner status={state.connection} onReconnect={() => client.reconnect()} />

  if (inThisRoom && state.room) {
    const { room } = state
    return (
      <>
        {banner}
        {room.phase === 'playing' ? (
          <OnlineRoundScreen key={state.round?.endsAt ?? 'round'} client={client} state={state} />
        ) : room.phase === 'result' && state.result ? (
          <OnlineResultScreen client={client} state={state} />
        ) : (
          <LobbyScreen client={client} state={state} />
        )}
      </>
    )
  }

  if (state.pending) {
    return (
      <main className="screen">
        {banner}
        <section className="panel">
          <p className="lede">Joining room {roomCode}…</p>
        </section>
      </main>
    )
  }

  return (
    <main className="screen setup-screen">
      {banner}
      {state.left ? (
        <section className="panel">
          <p className="error-message" role="alert">
            {LEFT_MESSAGES[state.left]}
          </p>
        </section>
      ) : null}
      <JoinForm
        title={`Join room ${roomCode}`}
        submitLabel="Join room"
        fixedCode={roomCode}
        disabled={state.pending}
        error={state.error?.message ?? null}
        onSubmit={(nickname) => client.join(roomCode, nickname)}
      />
      <Link to="/" className="back-link">
        ← Home
      </Link>
    </main>
  )
}
