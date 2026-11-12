import type { ErrorCode } from '@espiao/game-core'

export class RoomError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'RoomError'
    this.code = code
  }
}
