import type { ReactNode } from 'react'
import type { GameRound } from '../../types/game'

type ResultScreenProps = {
  round: GameRound
  /** A button is only shown when its handler is given (online, only the host has them). */
  onPlayAgain?: () => void
  onNewConfig?: () => void
  playAgainLabel?: string
  newConfigLabel?: string
  footer?: ReactNode
}

export function ResultScreen({
  round,
  onPlayAgain,
  onNewConfig,
  playAgainLabel = 'Jogar novamente',
  newConfigLabel = 'Nova configuração',
  footer,
}: ResultScreenProps) {
  const spies = round.players.filter((player) => player.role === 'spy')
  const hintText = round.location.hint || 'Dica não cadastrada'

  return (
    <main className="screen result-screen">
      <section className="panel">
        <p className="eyebrow">Resultado</p>
        <h1>{round.location.name}</h1>
        <p className="lede">Dica usada: {hintText}</p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Espiões</p>
            <h2>{spies.map((spy) => spy.name).join(', ')}</h2>
          </div>
        </div>

        <div className="result-list">
          {round.players.map((player) => (
            <div className="result-row" key={player.id}>
              <span>{player.name}</span>
              <strong>{player.role === 'spy' ? 'Espião' : 'Jogador comum'}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="actions">
        {onPlayAgain ? (
          <button type="button" className="primary-button" onClick={onPlayAgain}>
            {playAgainLabel}
          </button>
        ) : null}
        {onNewConfig ? (
          <button type="button" className="secondary-button" onClick={onNewConfig}>
            {newConfigLabel}
          </button>
        ) : null}
      </div>
      {footer}
    </main>
  )
}
