import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConnectionBanner } from '../online/ConnectionBanner'
import { JoinForm } from '../online/screens/JoinForm'
import { useRoomClient, useRoomState } from '../online/useRoomClient'

export function OnlineEntry() {
  const client = useRoomClient()
  const state = useRoomState()
  const navigate = useNavigate()

  useEffect(() => {
    client.connect()
  }, [client])

  useEffect(() => {
    if (state.roomCode && state.you) {
      navigate(`/room/${state.roomCode}`, { replace: true })
    }
  }, [state.roomCode, state.you, navigate])

  const error = state.error?.message ?? null

  return (
    <main className="screen setup-screen">
      <section className="hero-panel">
        <Link to="/" className="back-link">
          ← Home
        </Link>
        <p className="eyebrow">Group game</p>
        <h1>Play online</h1>
        <p className="lede">Create a room and share the link, or join with a friend's code.</p>
      </section>

      <ConnectionBanner status={state.connection} onReconnect={() => client.reconnect()} />

      <JoinForm
        title="Create room"
        submitLabel="Create room"
        disabled={state.pending}
        error={null}
        onSubmit={(nickname) => client.create(nickname)}
      />

      <JoinForm
        title="Join with a code"
        submitLabel="Join room"
        disabled={state.pending}
        error={error}
        fixedCode=""
        onSubmit={(nickname, code) => client.join(code, nickname)}
      />
    </main>
  )
}
