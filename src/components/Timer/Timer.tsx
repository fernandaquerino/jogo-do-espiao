import { useEffect, useMemo, useState } from 'react'

type TimerProps = {
  durationInMinutes: number
  onTimeUp: () => void
}

export function Timer({ durationInMinutes, onTimeUp }: TimerProps) {
  const totalSeconds = durationInMinutes * 60
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) {
      return
    }

    const timerId = window.setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timerId)
          setIsRunning(false)
          onTimeUp()
          return 0
        }

        return seconds - 1
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [isRunning, onTimeUp])

  const displayTime = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60)
    const seconds = secondsLeft % 60

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [secondsLeft])

  function resetTimer() {
    setSecondsLeft(totalSeconds)
    setIsRunning(false)
  }

  return (
    <div className="timer">
      <div className="timer-display">{displayTime}</div>
      <div className="actions timer-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => setIsRunning((running) => !running)}
          disabled={secondsLeft === 0}
        >
          {isRunning ? 'Pausar' : 'Iniciar'}
        </button>
        <button type="button" className="secondary-button" onClick={resetTimer}>
          Reiniciar
        </button>
      </div>
    </div>
  )
}
