import type { ErrorCode } from '@spy-game/game-core'

export class RoomError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'RoomError'
    this.code = code
  }
}
