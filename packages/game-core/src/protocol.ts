import type { Location, PlayerRole, RoundSettings } from './types.ts'

/** Wire protocol shared by the server and the web client (types only, no runtime code). */

export type RoomPhase = 'lobby' | 'playing' | 'result'

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NICKNAME_TAKEN'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INVALID_SETTINGS'
  | 'ROUND_IN_PROGRESS'
  // Additions to the spec's list, needed for malformed input and session handling:
  | 'INVALID_PAYLOAD'
  | 'NOT_IN_ROOM'
  | 'SESSION_INVALID'

export type PublicPlayer = {
  id: string
  nickname: string
  connected: boolean
}

// Client -> server
export type RoomCreatePayload = { nickname: string }
export type RoomJoinPayload = { roomCode: string; nickname: string }
export type RoomResumePayload = { roomCode: string; sessionToken: string }
export type RoomUpdateSettingsPayload = { settings: RoundSettings }
export type RoomKickPayload = { playerId: string }

// Server -> client
export type RoomJoinedPayload = { roomCode: string; sessionToken: string; you: PublicPlayer }
export type RoomStatePayload = {
  players: PublicPlayer[]
  hostId: string
  settings: RoundSettings
  phase: RoomPhase
}
export type RoundStartedPayload = { firstAskerId: string; endsAt: number }
/** Sent only to the player it describes. */
export type RoundRolePayload = { role: PlayerRole; location?: string; hint?: string }
export type RoundEndedPayload = { location: Location; spyIds: string[] }
export type RoomLeftPayload = { reason: 'kicked' | 'left' }
export type ErrorPayload = { code: ErrorCode; message: string }

export const CLIENT_EVENTS = {
  create: 'room:create',
  join: 'room:join',
  resume: 'room:resume',
  updateSettings: 'room:updateSettings',
  kick: 'room:kick',
  backToLobby: 'room:backToLobby',
  leave: 'room:leave',
  startRound: 'round:start',
  endRound: 'round:end',
} as const

export const SERVER_EVENTS = {
  joined: 'room:joined',
  state: 'room:state',
  left: 'room:left',
  roundStarted: 'round:started',
  roundRole: 'round:role',
  roundEnded: 'round:ended',
  error: 'error',
} as const
