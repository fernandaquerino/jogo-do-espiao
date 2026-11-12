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
        <p className="eyebrow">Round in progress</p>
        <h1>Ask questions and watch the answers</h1>
        <div className="starter-callout">
          <span>Asks first</span>
          <strong>{firstAsker?.name ?? 'Player 1'}</strong>
        </div>
        <Timer
          durationInMinutes={config.durationInMinutes}
          onTimeUp={handleTimeUp}
        />
        {isTimeUp ? <p className="success-message">Time is up!</p> : null}
        <button type="button" className="danger-button" onClick={onFinishRound}>
          End round
        </button>
      </section>
    </main>
  )
}
