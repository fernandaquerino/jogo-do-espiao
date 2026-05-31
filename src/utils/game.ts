import { LOCATIONS } from '../data/locations'
import type { GameConfig, GameRound, Location, Player } from '../types/game'
import { shuffle } from './shuffle'

export const DEFAULT_CONFIG: GameConfig = {
  playersCount: 5,
  spiesCount: 1,
  durationInMinutes: 5,
  spyGetsHint: true,
  playerNames: ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4', 'Jogador 5'],
  customLocations: [],
}

export function validateConfig(config: GameConfig): string | null {
  if (config.playersCount < 3) {
    return 'O jogo precisa de pelo menos 3 jogadores.'
  }

  if (config.playersCount > 20) {
    return 'O limite é de 20 jogadores.'
  }

  if (config.spiesCount < 1) {
    return 'Escolha pelo menos 1 espião.'
  }

  if (config.spiesCount >= config.playersCount) {
    return 'A quantidade de espiões deve ser menor que a de jogadores.'
  }

  if (config.durationInMinutes < 1) {
    return 'O tempo de jogo precisa ser de pelo menos 1 minuto.'
  }

  return null
}

export function buildPlayerNames(count: number, currentNames: string[]): string[] {
  return Array.from({ length: count }, (_, index) => {
    const currentName = currentNames[index]?.trim()
    return currentName || `Jogador ${index + 1}`
  })
}

export function getAvailableLocations(config: GameConfig): Location[] {
  return [...LOCATIONS, ...config.customLocations]
}

export function createRound(config: GameConfig): GameRound {
  const locations = getAvailableLocations(config)
  const location = locations[Math.floor(Math.random() * locations.length)]
  const spyIds = new Set(shuffle(Array.from({ length: config.playersCount }, (_, index) => index + 1)).slice(0, config.spiesCount))
  const playerNames = buildPlayerNames(config.playersCount, config.playerNames)

  const players: Player[] = playerNames.map((name, index) => ({
    id: index + 1,
    name,
    role: spyIds.has(index + 1) ? 'spy' : 'player',
  }))

  return { location, players }
}

export function loadSavedConfig(): GameConfig {
  const savedConfig = window.localStorage.getItem('espiao-config')

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
  window.localStorage.setItem('espiao-config', JSON.stringify(config))
}
