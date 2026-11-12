import type { Location, PlayerRole } from '@espiao/game-core'

export type { Location, PlayerRole }

export type GameConfig = {
  playersCount: number
  spiesCount: number
  durationInMinutes: number
  spyGetsHint: boolean
  playerNames: string[]
  customLocations: Location[]
}

export type Player = {
  id: number
  name: string
  role: PlayerRole
}

export type GameStep = 'setup' | 'reveal' | 'playing' | 'result'

export type GameRound = {
  location: Location
  players: Player[]
  firstAskerId: number
}
