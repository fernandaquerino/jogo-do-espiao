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
        <p className="role-title">Carregando seu papel…</p>
      ) : revealed ? (
        role.role === 'spy' ? (
          <>
            <p className="role-title">Você é o espião</p>
            {room.settings.spyGetsHint ? (
              <p className="role-detail">Dica: {role.hint || 'Dica ainda não cadastrada'}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="role-title">Lugar</p>
            <p className="role-detail">{role.location}</p>
          </>
        )
      ) : (
        <>
          <p className="role-title">Seu papel está oculto</p>
          <p className="role-detail">Toque para ver. Só você enxerga esta tela.</p>
        </>
      )}
    </div>
  )

  if (!ready) {
    return (
      <main className="screen reveal-screen">
        <section className="panel reveal-card">
          <p className="eyebrow">Seu papel</p>
          <h1>{you.nickname}</h1>
          {roleBox}
          <div className="actions">
            <button
              type="button"
              className="primary-button"
              disabled={!role}
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? 'Ocultar papel' : 'Revelar papel'}
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
              Estou pronto
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="screen game-screen">
      <section className="panel game-panel">
        <p className="eyebrow">Rodada em andamento</p>
        <h1>Façam perguntas e observem as respostas</h1>
        <div className="starter-callout">
          <span>Começa perguntando</span>
          <strong>{firstAsker?.nickname ?? '—'}</strong>
        </div>
        {round ? (
          <CountdownTimer endsAt={round.endsAt} clockOffsetMs={clockOffsetMs} onTimeUp={handleTimeUp} />
        ) : null}
        {isTimeUp ? <p className="success-message">Tempo encerrado!</p> : null}

        {roleBox}
        <div className="actions">
          <button
            type="button"
            className="secondary-button"
            disabled={!role}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? 'Ocultar meu papel' : 'Ver meu papel'}
          </button>
          {isHost ? (
            <button type="button" className="danger-button" onClick={() => client.endRound()}>
              Finalizar rodada
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}
