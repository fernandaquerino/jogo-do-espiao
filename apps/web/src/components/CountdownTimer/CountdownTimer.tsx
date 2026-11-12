import { useEffect, useState } from 'react'
import { formatCountdown, remainingMs } from '../../online/clock'
import { playTimeUpAlarm } from '../../utils/alarm'

type CountdownTimerProps = {
  endsAt: number
  clockOffsetMs: number
  onTimeUp?: () => void
}

/** Countdown driven by the server's end time, so every phone shows the same time. */
export function CountdownTimer({ endsAt, clockOffsetMs, onTimeUp }: CountdownTimerProps) {
  const [now, setNow] = useState(() => Date.now())
  const remaining = remainingMs(endsAt, clockOffsetMs, now)
  const isOver = remaining === 0

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (isOver) {
      playTimeUpAlarm()
      onTimeUp?.()
    }
  }, [isOver, onTimeUp])

  return (
    <div className="timer">
      <div
        className="timer-display"
        role="timer"
        aria-label={isOver ? 'Time is up' : `${formatCountdown(remaining)} left`}
      >
        {formatCountdown(remaining)}
      </div>
    </div>
  )
}
