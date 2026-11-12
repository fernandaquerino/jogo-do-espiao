import { describe, expect, it } from 'vitest'
import { formatCountdown, remainingMs } from './clock'

describe('remainingMs', () => {
  it('uses server time, correcting for a device clock that is ahead or behind', () => {
    // Device is 10 s behind the server: server now = device now + 10_000.
    expect(remainingMs(100_000, 10_000, 50_000)).toBe(40_000)
    // Device is 10 s ahead.
    expect(remainingMs(100_000, -10_000, 50_000)).toBe(60_000)
  })

  it('never goes negative', () => {
    expect(remainingMs(1_000, 0, 5_000)).toBe(0)
  })
})

describe('formatCountdown', () => {
  it('formats mm:ss, rounding partial seconds up', () => {
    expect(formatCountdown(5 * 60_000)).toBe('05:00')
    expect(formatCountdown(61_000)).toBe('01:01')
    expect(formatCountdown(59_001)).toBe('01:00')
    expect(formatCountdown(0)).toBe('00:00')
  })
})
