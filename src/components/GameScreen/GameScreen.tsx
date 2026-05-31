import { useCallback, useState } from 'react'
import type { GameConfig } from '../../types/game'
import { Timer } from '../Timer/Timer'

type GameScreenProps = {
  config: GameConfig
  onFinishRound: () => void
}

export function GameScreen({ config, onFinishRound }: GameScreenProps) {
  const [isTimeUp, setIsTimeUp] = useState(false)
  const handleTimeUp = useCallback(() => setIsTimeUp(true), [])

  return (
    <main className="screen game-screen">
      <section className="panel game-panel">
        <p className="eyebrow">Rodada em andamento</p>
        <h1>Façam perguntas e observem as respostas</h1>
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
