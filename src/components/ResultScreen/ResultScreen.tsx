import type { GameRound } from '../../types/game'

type ResultScreenProps = {
  round: GameRound
  onPlayAgain: () => void
  onNewConfig: () => void
}

export function ResultScreen({
  round,
  onPlayAgain,
  onNewConfig,
}: ResultScreenProps) {
  const spies = round.players.filter((player) => player.role === 'spy')

  return (
    <main className="screen result-screen">
      <section className="panel">
        <p className="eyebrow">Resultado</p>
        <h1>{round.location.name}</h1>
        <p className="lede">Dica usada: {round.location.hint}</p>
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
        <button type="button" className="primary-button" onClick={onPlayAgain}>
          Jogar novamente
        </button>
        <button type="button" className="secondary-button" onClick={onNewConfig}>
          Nova configuração
        </button>
      </div>
    </main>
  )
}
