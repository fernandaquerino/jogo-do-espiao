import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, MAX_PLAYERS } from '@espiao/game-core'
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './room-code.ts'
import { RoomError } from './room.errors.ts'
import { RoomService } from './room.service.ts'
import type { RoomEvent } from './room.service.ts'
import { InMemoryRoomStore } from './room-store.ts'

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (error) {
    return error instanceof RoomError ? error.code : 'UNEXPECTED'
  }
  return undefined
}

describe('RoomService: create and join', () => {
  let service: RoomService
  let events: RoomEvent[]

  beforeEach(() => {
    service = new RoomService(new InMemoryRoomStore())
    events = []
    service.onEvent((event) => events.push(event))
  })

  it('creates a room with a 6-character code without ambiguous characters', () => {
    for (let index = 0; index < 200; index += 1) {
      const { room } = service.createRoom(`Host ${index}`)
      expect(room.code).toHaveLength(ROOM_CODE_LENGTH)
      expect([...room.code].every((char) => ROOM_CODE_ALPHABET.includes(char))).toBe(true)
      expect(room.code).not.toMatch(/[01OI]/)
    }
  })

  it('makes the creator the host, in the lobby, with default settings', () => {
    const { room, player } = service.createRoom('  Fernanda  ')
    expect(player.nickname).toBe('Fernanda')
    expect(room.hostId).toBe(player.id)
    expect(room.phase).toBe('lobby')
    expect(room.settings).toEqual(DEFAULT_SETTINGS)
    expect(player.sessionToken.length).toBeGreaterThan(20)
  })

  it('lets players join by code, case-insensitively, and notifies the room', () => {
    const { room } = service.createRoom('Ana')
    const { player } = service.joinRoom(room.code.toLowerCase(), 'Bia')
    expect(room.players.map((p) => p.nickname)).toEqual(['Ana', 'Bia'])
    expect(player.id).not.toBe(room.hostId)
    expect(events).toContainEqual({ type: 'state', roomCode: room.code })
  })

  it('rejects unknown rooms, duplicate nicknames (any case) and bad nicknames', () => {
    const { room } = service.createRoom('Ana')
    expect(codeOf(() => service.joinRoom('ZZZZZZ', 'Bia'))).toBe('ROOM_NOT_FOUND')
    expect(codeOf(() => service.joinRoom(room.code, 'ana'))).toBe('NICKNAME_TAKEN')
    expect(codeOf(() => service.joinRoom(room.code, '   '))).toBe('INVALID_PAYLOAD')
    expect(codeOf(() => service.joinRoom(room.code, 'x'.repeat(21)))).toBe('INVALID_PAYLOAD')
    expect(codeOf(() => service.joinRoom(room.code, 'x'.repeat(20)))).toBeUndefined()
  })

  it('stops at 20 players', () => {
    const { room } = service.createRoom('P0')
    for (let index = 1; index < MAX_PLAYERS; index += 1) {
      service.joinRoom(room.code, `P${index}`)
    }
    expect(codeOf(() => service.joinRoom(room.code, 'extra'))).toBe('ROOM_FULL')
  })
})

describe('RoomService: leave, kick, settings', () => {
  let service: RoomService
  let events: RoomEvent[]

  beforeEach(() => {
    service = new RoomService(new InMemoryRoomStore())
    events = []
    service.onEvent((event) => events.push(event))
  })

  function roomOf(count: number) {
    const { room, player: host } = service.createRoom('Host')
    const others = Array.from({ length: count - 1 }, (_, index) => service.joinRoom(room.code, `P${index + 1}`).player)
    events.length = 0
    return { room, host, others }
  }

  it('passes the host to the next player when the host leaves', () => {
    const { room, host, others } = roomOf(3)
    service.leave(room.code, host.id)
    expect(room.hostId).toBe(others[0]!.id)
    expect(room.players).toHaveLength(2)
    expect(events).toContainEqual({ type: 'state', roomCode: room.code })
  })

  it('deletes the room when the last player leaves', () => {
    const { room, host } = roomOf(1)
    service.leave(room.code, host.id)
    expect(service.getRoom(room.code)).toBeUndefined()
  })

  it('lets only the host kick, never the host itself', () => {
    const { room, host, others } = roomOf(3)
    expect(codeOf(() => service.kick(room.code, others[0]!.id, others[1]!.id))).toBe('NOT_HOST')
    expect(codeOf(() => service.kick(room.code, host.id, host.id))).toBe('INVALID_PAYLOAD')
    service.kick(room.code, host.id, others[1]!.id)
    expect(room.players.map((p) => p.id)).toEqual([host.id, others[0]!.id])
    expect(events).toContainEqual({
      type: 'removed',
      roomCode: room.code,
      playerId: others[1]!.id,
      reason: 'kicked',
    })
  })

  it('lets only the host change settings, and validates them', () => {
    const { room, host, others } = roomOf(4)
    const next = { ...DEFAULT_SETTINGS, spiesCount: 2, durationInMinutes: 8 }
    expect(codeOf(() => service.updateSettings(room.code, others[0]!.id, next))).toBe('NOT_HOST')
    service.updateSettings(room.code, host.id, next)
    expect(room.settings.spiesCount).toBe(2)
    expect(codeOf(() => service.updateSettings(room.code, host.id, { ...next, spiesCount: 0 }))).toBe('INVALID_SETTINGS')
    expect(codeOf(() => service.updateSettings(room.code, host.id, { ...next, durationInMinutes: 99 }))).toBe('INVALID_SETTINGS')
  })

  it('trims custom locations and keeps them in the settings', () => {
    const { room, host } = roomOf(3)
    service.updateSettings(room.code, host.id, {
      ...DEFAULT_SETTINGS,
      customLocations: [{ name: '  Casa da vovó ', hint: ' bolo ' }],
    })
    expect(room.settings.customLocations).toEqual([{ name: 'Casa da vovó', hint: 'bolo' }])
  })
})
