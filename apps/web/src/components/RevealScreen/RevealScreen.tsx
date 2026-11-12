import { useState } from 'react'
import type { GameConfig, GameRound } from '../../types/game'

type RevealScreenProps = {
  config: GameConfig
  round: GameRound
  onStartRound: () => void
}

export function RevealScreen({
  config,
  round,
  onStartRound,
}: RevealScreenProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isRevealComplete, setIsRevealComplete] = useState(false)
  const currentPlayer = round.players[currentPlayerIndex]
  const isLastPlayer = currentPlayerIndex === round.players.length - 1
  const hintText = round.location.hint || 'No hint available yet'

  function hideAndContinue() {
    setIsRevealed(false)

    if (isLastPlayer) {
      setIsRevealComplete(true)
      return
    }

    setCurrentPlayerIndex((index) => index + 1)
  }

  return (
    <main className="screen reveal-screen">
      <section className="panel reveal-card">
        <p className="eyebrow">
          {currentPlayerIndex + 1} de {round.players.length}
        </p>
        <h1>{isRevealComplete ? 'Everyone is ready' : currentPlayer.name}</h1>

        <div className={`role-box ${isRevealed ? 'revealed' : ''}`}>
          {isRevealComplete ? (
            <>
              <p className="role-title">Roles seen and hidden</p>
              <p className="role-detail">Start when the group is ready.</p>
            </>
          ) : isRevealed ? (
            currentPlayer.role === 'spy' ? (
              <>
                <p className="role-title">You are the spy</p>
                {config.spyGetsHint ? (
                  <p className="role-detail">Hint: {hintText}</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="role-title">Location</p>
                <p className="role-detail">{round.location.name}</p>
              </>
            )
          ) : (
            <>
              <p className="role-title">Hand the device to this player</p>
              <p className="role-detail">Tap only when you are ready.</p>
            </>
          )}
        </div>

        <div className="actions">
          {isRevealComplete ? (
            <button type="button" className="primary-button" onClick={onStartRound}>
              Start round
            </button>
          ) : !isRevealed ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => setIsRevealed(true)}
            >
              Reveal role
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button"
              onClick={hideAndContinue}
            >
              {isLastPlayer
                ? 'Hide role'
                : 'Hide and pass to the next player'}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
