import { useCallback, useState } from 'react'
import { CountdownTimer } from '../../components/CountdownTimer/CountdownTimer'
import type { ClientState, RoomClient } from '../RoomClient'

type OnlineRoundScreenProps = {
  client: RoomClient
  state: ClientState
}

/** Private role reveal first, then the shared countdown. Remounted for every round. */
export function OnlineRoundScreen({ client, state }: OnlineRoundScreenProps) {
  const { room, you, role, round, clockOffsetMs } = state
  const [ready, setReady] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const handleTimeUp = useCallback(() => setIsTimeUp(true), [])

  if (!room || !you) {
    return null
  }

  const isHost = room.hostId === you.id
  const firstAsker = room.players.find((player) => player.id === round?.firstAskerId)

  const roleBox = (
    <div className={`role-box ${revealed ? 'revealed' : ''}`}>
      {!role ? (
        <p className="role-title">Loading your role…</p>
      ) : revealed ? (
        role.role === 'spy' ? (
          <>
            <p className="role-title">You are the spy</p>
            {room.settings.spyGetsHint ? (
              <p className="role-detail">Hint: {role.hint || 'No hint available yet'}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="role-title">Location</p>
            <p className="role-detail">{role.location}</p>
          </>
        )
      ) : (
        <>
          <p className="role-title">Your role is hidden</p>
          <p className="role-detail">Tap to reveal. Only you can see this screen.</p>
        </>
      )}
    </div>
  )

  if (!ready) {
    return (
      <main className="screen reveal-screen">
        <section className="panel reveal-card">
          <p className="eyebrow">Your role</p>
          <h1>{you.nickname}</h1>
          {roleBox}
          <div className="actions">
            <button
              type="button"
              className="primary-button"
              disabled={!role}
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? 'Hide role' : 'Reveal role'}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!role}
              onClick={() => {
                setRevealed(false)
                setReady(true)
              }}
            >
              I am ready
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="screen game-screen">
      <section className="panel game-panel">
        <p className="eyebrow">Round in progress</p>
        <h1>Ask questions and watch the answers</h1>
        <div className="starter-callout">
          <span>Asks first</span>
          <strong>{firstAsker?.nickname ?? '—'}</strong>
        </div>
        {round ? (
          <CountdownTimer endsAt={round.endsAt} clockOffsetMs={clockOffsetMs} onTimeUp={handleTimeUp} />
        ) : null}
        {isTimeUp ? <p className="success-message">Time is up!</p> : null}

        {roleBox}
        <div className="actions">
          <button
            type="button"
            className="secondary-button"
            disabled={!role}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? 'Hide my role' : 'See my role'}
          </button>
          {isHost ? (
            <button type="button" className="danger-button" onClick={() => client.endRound()}>
              End round
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}
