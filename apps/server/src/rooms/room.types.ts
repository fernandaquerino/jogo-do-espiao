import type { Location, RoomPhase, RoundSettings } from '@espiao/game-core'

export type PlayerRecord = {
  id: string
  nickname: string
  /** Secret used to resume a seat. Never sent to other players. */
  sessionToken: string
  connected: boolean
}

export type RoundRecord = {
  location: Location
  spyIds: string[]
  firstAskerId: string
  /** Epoch milliseconds when the round ends. */
  endsAt: number
}

export type Room = {
  code: string
  hostId: string
  /** Join order; the first remaining player inherits the host role. */
  players: PlayerRecord[]
  settings: RoundSettings
  phase: RoomPhase
  round: RoundRecord | null
}
