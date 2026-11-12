import { useEffect, useMemo, useState } from 'react'

type TimerProps = {
  durationInMinutes: number
  onTimeUp: () => void
}

function playTimeUpAlarm() {
  const browserWindow = window as Window &
    typeof globalThis & {
      webkitAudioContext?: typeof AudioContext
    }
  const AudioContextClass =
    browserWindow.AudioContext || browserWindow.webkitAudioContext

  if (!AudioContextClass) {
    return
  }

  const audioContext = new AudioContextClass()
  const now = audioContext.currentTime
  const notes = [880, 660, 880]

  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const startsAt = now + index * 0.24
    const endsAt = startsAt + 0.18

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, startsAt)
    gain.gain.setValueAtTime(0.0001, startsAt)
    gain.gain.exponentialRampToValueAtTime(0.22, startsAt + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, endsAt)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(startsAt)
    oscillator.stop(endsAt)
  })

  window.setTimeout(() => void audioContext.close(), 1100)
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
          playTimeUpAlarm()
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
