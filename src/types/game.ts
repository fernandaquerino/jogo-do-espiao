export type GameConfig = {
  playersCount: number
  spiesCount: number
  durationInMinutes: number
  spyGetsHint: boolean
  playerNames: string[]
  customLocations: Location[]
}

export type PlayerRole = 'player' | 'spy'

export type Player = {
  id: number
  name: string
  role: PlayerRole
}

export type Location = {
  name: string
  hint: string
}

export type GameStep = 'setup' | 'reveal' | 'playing' | 'result'

export type GameRound = {
  location: Location
  players: Player[]
  firstAskerId: number
}
