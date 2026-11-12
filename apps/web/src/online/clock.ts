/** Milliseconds left until `endsAt` (server time), given how far this device's clock is off. */
export function remainingMs(endsAt: number, clockOffsetMs: number, deviceNow: number): number {
  return Math.max(0, endsAt - (deviceNow + clockOffsetMs))
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
