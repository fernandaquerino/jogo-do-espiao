import {
  MAX_CUSTOM_LOCATIONS,
  MAX_DURATION_MINUTES,
  MAX_LOCATION_HINT_LENGTH,
  MAX_LOCATION_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_DURATION_MINUTES,
  MIN_PLAYERS,
} from './limits.ts'
import type { RoundSettings, SettingsIssue } from './types.ts'

export const DEFAULT_SETTINGS: RoundSettings = {
  spiesCount: 1,
  durationInMinutes: 5,
  spyGetsHint: true,
  customLocations: [],
}

/**
 * Validates round settings against the number of players.
 * Returns the first problem found, or null when the round can start.
 */
export function validateSettings(
  settings: RoundSettings,
  playersCount: number,
): SettingsIssue | null {
  if (playersCount < MIN_PLAYERS) {
    return {
      code: 'NOT_ENOUGH_PLAYERS',
      message: `The game needs at least ${MIN_PLAYERS} players.`,
    }
  }

  if (playersCount > MAX_PLAYERS) {
    return {
      code: 'INVALID_SETTINGS',
      message: `The limit is ${MAX_PLAYERS} players.`,
    }
  }

  if (!Number.isInteger(settings.spiesCount) || settings.spiesCount < 1) {
    return { code: 'INVALID_SETTINGS', message: 'Choose at least 1 spy.' }
  }

  if (settings.spiesCount >= playersCount) {
    return {
      code: 'INVALID_SETTINGS',
      message: 'The number of spies must be lower than the number of players.',
    }
  }

  if (
    !Number.isFinite(settings.durationInMinutes) ||
    settings.durationInMinutes < MIN_DURATION_MINUTES
  ) {
    return {
      code: 'INVALID_SETTINGS',
      message: `The game time must be at least ${MIN_DURATION_MINUTES} minute.`,
    }
  }

  if (settings.durationInMinutes > MAX_DURATION_MINUTES) {
    return {
      code: 'INVALID_SETTINGS',
      message: `The game time can be at most ${MAX_DURATION_MINUTES} minutes.`,
    }
  }

  if (settings.customLocations.length > MAX_CUSTOM_LOCATIONS) {
    return {
      code: 'INVALID_SETTINGS',
      message: `Use at most ${MAX_CUSTOM_LOCATIONS} custom locations.`,
    }
  }

  const badLocation = settings.customLocations.find(
    (location) =>
      !location.name.trim() ||
      location.name.length > MAX_LOCATION_NAME_LENGTH ||
      location.hint.length > MAX_LOCATION_HINT_LENGTH,
  )

  if (badLocation) {
    return {
      code: 'INVALID_SETTINGS',
      message: 'A custom location has an empty name or text that is too long.',
    }
  }

  return null
}
