export function playTimeUpAlarm() {
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
