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
  const hintText = round.location.hint || 'Dica ainda não cadastrada'

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
        <h1>{isRevealComplete ? 'Todos prontos' : currentPlayer.name}</h1>

        <div className={`role-box ${isRevealed ? 'revealed' : ''}`}>
          {isRevealComplete ? (
            <>
              <p className="role-title">Papéis vistos e ocultos</p>
              <p className="role-detail">Comecem quando o grupo estiver pronto.</p>
            </>
          ) : isRevealed ? (
            currentPlayer.role === 'spy' ? (
              <>
                <p className="role-title">Você é o espião</p>
                {config.spyGetsHint ? (
                  <p className="role-detail">Dica: {hintText}</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="role-title">Lugar</p>
                <p className="role-detail">{round.location.name}</p>
              </>
            )
          ) : (
            <>
              <p className="role-title">Passe o aparelho para este jogador</p>
              <p className="role-detail">Toque apenas quando estiver pronto.</p>
            </>
          )}
        </div>

        <div className="actions">
          {isRevealComplete ? (
            <button type="button" className="primary-button" onClick={onStartRound}>
              Começar rodada
            </button>
          ) : !isRevealed ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => setIsRevealed(true)}
            >
              Revelar papel
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button"
              onClick={hideAndContinue}
            >
              {isLastPlayer
                ? 'Ocultar papel'
                : 'Ocultar e passar para o próximo jogador'}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
