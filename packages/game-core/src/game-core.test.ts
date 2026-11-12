import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  LOCATIONS,
  createRound,
  getAvailableLocations,
  shuffle,
  validateSettings,
} from './index.ts'

/** mulberry32: small seeded PRNG so tests are reproducible. */
function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('LOCATIONS', () => {
  it('has unique, non-empty names (hints may be empty: the UI falls back)', () => {
    const names = LOCATIONS.map((location) => location.name)
    expect(new Set(names).size).toBe(names.length)
    expect(LOCATIONS.every((location) => location.name.trim() && typeof location.hint === 'string')).toBe(true)
  })
})

describe('shuffle', () => {
  it('keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5]
    const output = shuffle(input, seeded(1))
    expect([...output].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })
})

describe('validateSettings', () => {
  it('accepts the defaults with 5 players', () => {
    expect(validateSettings(DEFAULT_SETTINGS, 5)).toBeNull()
  })

  it('rejects fewer than 3 players', () => {
    expect(validateSettings(DEFAULT_SETTINGS, 2)?.code).toBe('NOT_ENOUGH_PLAYERS')
  })

  it('rejects more than 20 players', () => {
    expect(validateSettings(DEFAULT_SETTINGS, 21)?.code).toBe('INVALID_SETTINGS')
  })

  it('requires fewer spies than players and at least one spy', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, spiesCount: 3 }, 3)?.code).toBe('INVALID_SETTINGS')
    expect(validateSettings({ ...DEFAULT_SETTINGS, spiesCount: 0 }, 5)?.code).toBe('INVALID_SETTINGS')
    expect(validateSettings({ ...DEFAULT_SETTINGS, spiesCount: 1.5 }, 5)?.code).toBe('INVALID_SETTINGS')
  })

  it('bounds the duration', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, durationInMinutes: 0 }, 5)?.code).toBe('INVALID_SETTINGS')
    expect(validateSettings({ ...DEFAULT_SETTINGS, durationInMinutes: 61 }, 5)?.code).toBe('INVALID_SETTINGS')
    expect(validateSettings({ ...DEFAULT_SETTINGS, durationInMinutes: Number.NaN }, 5)?.code).toBe('INVALID_SETTINGS')
  })

  it('rejects blank custom locations', () => {
    const settings = { ...DEFAULT_SETTINGS, customLocations: [{ name: '  ', hint: 'x' }] }
    expect(validateSettings(settings, 5)?.code).toBe('INVALID_SETTINGS')
  })
})

describe('createRound', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']

  it('draws the requested number of distinct spies from the players', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const round = createRound(ids, { ...DEFAULT_SETTINGS, spiesCount: 2 }, seeded(seed))
      expect(round.spyIds).toHaveLength(2)
      expect(new Set(round.spyIds).size).toBe(2)
      expect(round.spyIds.every((id) => ids.includes(id))).toBe(true)
    }
  })

  it('never makes a spy the first asker', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const round = createRound(ids, { ...DEFAULT_SETTINGS, spiesCount: 2 }, seeded(seed))
      expect(round.spyIds).not.toContain(round.firstAskerId)
      expect(ids).toContain(round.firstAskerId)
    }
  })

  it('picks the location from the built-in and custom lists', () => {
    const custom = { name: 'Casa da vovó', hint: 'Lugar com bolo' }
    const settings = { ...DEFAULT_SETTINGS, customLocations: [custom] }
    expect(getAvailableLocations(settings)).toHaveLength(LOCATIONS.length + 1)
    const seen = new Set<string>()
    for (let seed = 1; seed <= 400; seed += 1) {
      seen.add(createRound(ids, settings, seeded(seed)).location.name)
    }
    expect(seen.has('Casa da vovó')).toBe(true)
    expect(seen.size).toBeGreaterThan(10)
  })

  it('is deterministic for a given random source', () => {
    expect(createRound(ids, DEFAULT_SETTINGS, seeded(7))).toEqual(
      createRound(ids, DEFAULT_SETTINGS, seeded(7)),
    )
  })

  it('works with numeric ids and refuses an empty room', () => {
    expect(createRound([1, 2, 3], DEFAULT_SETTINGS, seeded(3)).firstAskerId).toBeTypeOf('number')
    expect(() => createRound([], DEFAULT_SETTINGS)).toThrow()
  })
})
