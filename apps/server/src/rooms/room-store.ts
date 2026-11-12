import type { Room } from './room.types.ts'

/**
 * Where room state lives. Phase 1 only has an in-memory implementation.
 * It is synchronous on purpose; a Redis adapter (see ROADMAP) will have to make it async.
 */
export interface RoomStore {
  get(code: string): Room | undefined
  save(room: Room): void
  delete(code: string): void
  has(code: string): boolean
  size(): number
}

export const ROOM_STORE = Symbol('ROOM_STORE')

export class InMemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, Room>()

  get(code: string): Room | undefined {
    return this.rooms.get(code)
  }

  save(room: Room): void {
    this.rooms.set(room.code, room)
  }

  delete(code: string): void {
    this.rooms.delete(code)
  }

  has(code: string): boolean {
    return this.rooms.has(code)
  }

  size(): number {
    return this.rooms.size
  }
}
