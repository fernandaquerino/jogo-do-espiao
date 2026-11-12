import { useCallback, useState } from 'react'
import type { GameConfig, GameRound } from '../../types/game'
import { Timer } from '../Timer/Timer'

type GameScreenProps = {
  config: GameConfig
  round: GameRound
  onFinishRound: () => void
}

export function GameScreen({ config, round, onFinishRound }: GameScreenProps) {
  const [isTimeUp, setIsTimeUp] = useState(false)
  const handleTimeUp = useCallback(() => setIsTimeUp(true), [])
  const firstAsker = round.players.find(
    (player) => player.id === round.firstAskerId,
  )

  return (
    <main className="screen game-screen">
      <section className="panel game-panel">
        <p className="eyebrow">Rodada em andamento</p>
        <h1>Façam perguntas e observem as respostas</h1>
        <div className="starter-callout">
          <span>Começa perguntando</span>
          <strong>{firstAsker?.name ?? 'Jogador 1'}</strong>
        </div>
        <Timer
          durationInMinutes={config.durationInMinutes}
          onTimeUp={handleTimeUp}
        />
        {isTimeUp ? <p className="success-message">Tempo encerrado!</p> : null}
        <button type="button" className="danger-button" onClick={onFinishRound}>
          Finalizar rodada
        </button>
      </section>
    </main>
  )
}
