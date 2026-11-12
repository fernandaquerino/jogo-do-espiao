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
      message: `O jogo precisa de pelo menos ${MIN_PLAYERS} jogadores.`,
    }
  }

  if (playersCount > MAX_PLAYERS) {
    return {
      code: 'INVALID_SETTINGS',
      message: `O limite é de ${MAX_PLAYERS} jogadores.`,
    }
  }

  if (!Number.isInteger(settings.spiesCount) || settings.spiesCount < 1) {
    return { code: 'INVALID_SETTINGS', message: 'Escolha pelo menos 1 espião.' }
  }

  if (settings.spiesCount >= playersCount) {
    return {
      code: 'INVALID_SETTINGS',
      message: 'A quantidade de espiões deve ser menor que a de jogadores.',
    }
  }

  if (
    !Number.isFinite(settings.durationInMinutes) ||
    settings.durationInMinutes < MIN_DURATION_MINUTES
  ) {
    return {
      code: 'INVALID_SETTINGS',
      message: `O tempo de jogo precisa ser de pelo menos ${MIN_DURATION_MINUTES} minuto.`,
    }
  }

  if (settings.durationInMinutes > MAX_DURATION_MINUTES) {
    return {
      code: 'INVALID_SETTINGS',
      message: `O tempo de jogo pode ter no máximo ${MAX_DURATION_MINUTES} minutos.`,
    }
  }

  if (settings.customLocations.length > MAX_CUSTOM_LOCATIONS) {
    return {
      code: 'INVALID_SETTINGS',
      message: `Use no máximo ${MAX_CUSTOM_LOCATIONS} lugares personalizados.`,
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
      message: 'Há um lugar personalizado com nome vazio ou texto muito longo.',
    }
  }

  return null
}
