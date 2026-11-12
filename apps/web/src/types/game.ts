import type { Location, PlayerRole } from '@spy-game/game-core'

export type { Location, PlayerRole }

export type GameConfig = {
  playersCount: number
  spiesCount: number
  durationInMinutes: number
  spyGetsHint: boolean
  playerNames: string[]
  customLocations: Location[]
}

export type PlayerId = number | string

export type Player = {
  id: PlayerId
  name: string
  role: PlayerRole
}

export type GameStep = 'setup' | 'reveal' | 'playing' | 'result'

export type GameRound = {
  location: Location
  players: Player[]
  firstAskerId: PlayerId
}
