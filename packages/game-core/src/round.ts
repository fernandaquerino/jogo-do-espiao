import { LOCATIONS } from './locations.ts'
import { shuffle } from './shuffle.ts'
import type { Location, Random, Round, RoundSettings } from './types.ts'

export function getAvailableLocations(settings: Pick<RoundSettings, 'customLocations'>): Location[] {
  return [...LOCATIONS, ...settings.customLocations]
}

/**
 * Draws the location, the spies and who asks first.
 * Callers must validate the settings first (see `validateSettings`).
 */
export function createRound<Id extends string | number>(
  playerIds: readonly Id[],
  settings: RoundSettings,
  random: Random = Math.random,
): Round<Id> {
  if (playerIds.length === 0) {
    throw new Error('createRound needs at least one player')
  }

  const locations = getAvailableLocations(settings)
  const location = locations[Math.floor(random() * locations.length)] as Location
  const shuffledIds = shuffle(playerIds, random)
  const spyIds = shuffledIds.slice(0, settings.spiesCount)
  const firstAskerId = (shuffledIds[settings.spiesCount] ?? shuffledIds[0]) as Id

  return { location, spyIds, firstAskerId }
}
