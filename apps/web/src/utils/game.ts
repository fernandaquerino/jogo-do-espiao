import { createRound as drawRound, getAvailableLocations as listLocations, validateSettings } from '@spy-game/game-core'
import type { GameConfig, GameRound, Location, Player } from '../types/game'

export const DEFAULT_CONFIG: GameConfig = {
  playersCount: 5,
  spiesCount: 1,
  durationInMinutes: 5,
  spyGetsHint: true,
  playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'],
  customLocations: [],
}

export function validateConfig(config: GameConfig): string | null {
  return validateSettings(config, config.playersCount)?.message ?? null
}

export function buildPlayerNames(count: number, currentNames: string[]): string[] {
  return Array.from({ length: count }, (_, index) => {
    const currentName = currentNames[index]?.trim()
    return currentName || `Player ${index + 1}`
  })
}

export function getAvailableLocations(config: GameConfig): Location[] {
  return listLocations(config)
}

export function createRound(config: GameConfig): GameRound {
  const playerIds = Array.from({ length: config.playersCount }, (_, index) => index + 1)
  const { location, spyIds, firstAskerId } = drawRound(playerIds, config)
  const spies = new Set(spyIds)
  const playerNames = buildPlayerNames(config.playersCount, config.playerNames)

  const players: Player[] = playerNames.map((name, index) => ({
    id: index + 1,
    name,
    role: spies.has(index + 1) ? 'spy' : 'player',
  }))

  return { location, players, firstAskerId }
}

export function loadSavedConfig(): GameConfig {
  const savedConfig = window.localStorage.getItem('spy-game-config')

  if (!savedConfig) {
    return DEFAULT_CONFIG
  }

  try {
    const parsedConfig = JSON.parse(savedConfig) as Partial<GameConfig>
    const playersCount = Number(parsedConfig.playersCount) || DEFAULT_CONFIG.playersCount

    return {
      ...DEFAULT_CONFIG,
      ...parsedConfig,
      playersCount,
      spiesCount: Math.min(
        Number(parsedConfig.spiesCount) || DEFAULT_CONFIG.spiesCount,
        playersCount - 1,
      ),
      durationInMinutes:
        Number(parsedConfig.durationInMinutes) || DEFAULT_CONFIG.durationInMinutes,
      playerNames: buildPlayerNames(playersCount, parsedConfig.playerNames ?? []),
      customLocations: Array.isArray(parsedConfig.customLocations)
        ? parsedConfig.customLocations.filter(
            (location) => location.name?.trim() && location.hint?.trim(),
          )
        : [],
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: GameConfig) {
  window.localStorage.setItem('spy-game-config', JSON.stringify(config))
}
