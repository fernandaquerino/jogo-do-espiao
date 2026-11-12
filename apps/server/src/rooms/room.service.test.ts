import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, MAX_PLAYERS } from '@spy-game/game-core'
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './room-code.ts'
import { RoomError } from './room.errors.ts'
import { RECONNECT_GRACE_MS, ROOM_EXPIRY_MS, RoomService, toRoomState } from './room.service.ts'
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
      customLocations: [{ name: "  Grandma's house ", hint: ' cake ' }],
    })
    expect(room.settings.customLocations).toEqual([{ name: "Grandma's house", hint: 'cake' }])
  })
})

describe('RoomService: rounds', () => {
  let service: RoomService
  let events: RoomEvent[]

  beforeEach(() => {
    vi.useFakeTimers()
    service = new RoomService(new InMemoryRoomStore())
    events = []
    service.onEvent((event) => events.push(event))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function roomOf(count: number, settings: Partial<typeof DEFAULT_SETTINGS> = {}) {
    const { room, player: host } = service.createRoom('Host')
    const others = Array.from({ length: count - 1 }, (_, index) => service.joinRoom(room.code, `P${index + 1}`).player)
    if (Object.keys(settings).length > 0) {
      service.updateSettings(room.code, host.id, { ...DEFAULT_SETTINGS, ...settings })
    }
    events.length = 0
    return { room, host, others }
  }

  it('needs at least 3 players and fewer spies than players', () => {
    const small = roomOf(2)
    expect(codeOf(() => service.startRound(small.room.code, small.host.id))).toBe('NOT_ENOUGH_PLAYERS')

    const { room, host } = roomOf(4, { spiesCount: 3 })
    expect(codeOf(() => service.startRound(room.code, host.id))).toBeUndefined()

    const tight = roomOf(4, { spiesCount: 3 })
    tight.room.players.pop()
    expect(codeOf(() => service.startRound(tight.room.code, tight.host.id))).toBe('INVALID_SETTINGS')
  })

  it('only the host starts, and not twice', () => {
    const { room, host, others } = roomOf(3)
    expect(codeOf(() => service.startRound(room.code, others[0]!.id))).toBe('NOT_HOST')
    service.startRound(room.code, host.id)
    expect(codeOf(() => service.startRound(room.code, host.id))).toBe('ROUND_IN_PROGRESS')
    expect(codeOf(() => service.updateSettings(room.code, host.id, DEFAULT_SETTINGS))).toBe('ROUND_IN_PROGRESS')
    expect(codeOf(() => service.joinRoom(room.code, 'Late'))).toBe('ROUND_IN_PROGRESS')
    expect(codeOf(() => service.kick(room.code, host.id, others[0]!.id))).toBe('ROUND_IN_PROGRESS')
  })

  it('sets endsAt from the configured duration', () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
    const { room, host } = roomOf(3, { durationInMinutes: 8 })
    service.startRound(room.code, host.id)
    expect(room.round?.endsAt).toBe(Date.parse('2026-01-01T12:08:00Z'))
  })

  it('gives spies no location, and the hint only when enabled', () => {
    const withHint = roomOf(5, { spiesCount: 2, spyGetsHint: true })
    service.startRound(withHint.room.code, withHint.host.id)
    const round = withHint.room.round!
    for (const player of withHint.room.players) {
      const role = service.roleFor(withHint.room, player.id)!
      if (round.spyIds.includes(player.id)) {
        expect(role.role).toBe('spy')
        expect(role.location).toBeUndefined()
        expect(role.hint).toBe(round.location.hint)
      } else {
        expect(role).toEqual({ role: 'player', location: round.location.name })
      }
    }

    const noHint = roomOf(3, { spyGetsHint: false })
    service.startRound(noHint.room.code, noHint.host.id)
    const spyId = noHint.room.round!.spyIds[0]!
    expect(service.roleFor(noHint.room, spyId)).toEqual({ role: 'spy' })
  })

  it('exposes no roles and no result outside of a running round', () => {
    const { room, host } = roomOf(3)
    expect(service.roleFor(room, host.id)).toBeNull()
    expect(service.resultOf(room)).toBeNull()
    service.startRound(room.code, host.id)
    expect(service.resultOf(room)).toBeNull()
  })

  it('ends by itself when the timer runs out and then reveals the result', () => {
    const { room, host } = roomOf(3, { durationInMinutes: 2 })
    service.startRound(room.code, host.id)
    vi.advanceTimersByTime(2 * 60_000 - 1)
    expect(room.phase).toBe('playing')
    vi.advanceTimersByTime(1)
    expect(room.phase).toBe('result')
    expect(events.filter((e) => e.type === 'roundEnded')).toHaveLength(1)
    expect(service.resultOf(room)).toEqual({ location: room.round!.location, spyIds: room.round!.spyIds })
    expect(service.roleFor(room, host.id)).toBeNull()
  })

  it('lets the host end early (once) and the timer then does nothing', () => {
    const { room, host, others } = roomOf(3)
    expect(codeOf(() => service.endRound(room.code, host.id))).toBe('INVALID_PAYLOAD')
    service.startRound(room.code, host.id)
    expect(codeOf(() => service.endRound(room.code, others[0]!.id))).toBe('NOT_HOST')
    service.endRound(room.code, host.id)
    vi.advanceTimersByTime(10 * 60_000)
    expect(events.filter((e) => e.type === 'roundEnded')).toHaveLength(1)
  })

  it('starts a new round from the result, or goes back to the lobby', () => {
    const { room, host } = roomOf(3)
    service.startRound(room.code, host.id)
    expect(codeOf(() => service.backToLobby(room.code, host.id))).toBe('ROUND_IN_PROGRESS')
    service.endRound(room.code, host.id)
    service.startRound(room.code, host.id)
    expect(room.phase).toBe('playing')
    service.endRound(room.code, host.id)
    service.backToLobby(room.code, host.id)
    expect(room.phase).toBe('lobby')
    expect(room.round).toBeNull()
  })

  it('never puts roles or the location in the public room state', () => {
    const { room, host } = roomOf(4)
    service.startRound(room.code, host.id)
    const serialized = JSON.stringify(toRoomState(room))
    expect(serialized).not.toContain(room.round!.location.name)
    expect(serialized).not.toContain('spyIds')
    expect(serialized).not.toContain('sessionToken')
  })
})

describe('RoomService: reconnection, handover and expiry', () => {
  let service: RoomService
  let events: RoomEvent[]

  beforeEach(() => {
    vi.useFakeTimers()
    service = new RoomService(new InMemoryRoomStore())
    events = []
    service.onEvent((event) => events.push(event))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function roomOf(count: number) {
    const { room, player: host } = service.createRoom('Host')
    const others = Array.from({ length: count - 1 }, (_, index) => service.joinRoom(room.code, `P${index + 1}`).player)
    events.length = 0
    return { room, host, others }
  }

  it('keeps the seat for 60 s and returns the same player on resume', () => {
    const { room, others } = roomOf(3)
    const player = others[0]!
    service.disconnect(room.code, player.id)
    expect(player.connected).toBe(false)
    expect(events).toContainEqual({ type: 'state', roomCode: room.code })

    vi.advanceTimersByTime(RECONNECT_GRACE_MS - 1)
    const seat = service.resume(room.code, player.sessionToken)
    expect(seat.player.id).toBe(player.id)
    expect(seat.player.connected).toBe(true)

    vi.advanceTimersByTime(5 * 60_000)
    expect(room.players).toHaveLength(3)
  })

  it('gives the seat away after 60 s, and the old token stops working', () => {
    const { room, others } = roomOf(3)
    const player = others[0]!
    service.disconnect(room.code, player.id)
    vi.advanceTimersByTime(RECONNECT_GRACE_MS)
    expect(room.players.map((p) => p.id)).not.toContain(player.id)
    expect(codeOf(() => service.resume(room.code, player.sessionToken))).toBe('SESSION_INVALID')
  })

  it('restores the player\'s own role mid-round', () => {
    const { room, host, others } = roomOf(4)
    service.startRound(room.code, host.id)
    const target = others[1]!
    const before = service.roleFor(room, target.id)
    service.disconnect(room.code, target.id)
    vi.advanceTimersByTime(30_000)
    const { player } = service.resume(room.code, target.sessionToken)
    expect(service.roleFor(room, player.id)).toEqual(before)
  })

  it('rejects wrong tokens, tokens from other rooms and unknown rooms', () => {
    const first = roomOf(3)
    const second = service.createRoom('Other')
    expect(codeOf(() => service.resume(first.room.code, 'nope'))).toBe('SESSION_INVALID')
    expect(codeOf(() => service.resume(first.room.code, second.player.sessionToken))).toBe('SESSION_INVALID')
    expect(codeOf(() => service.resume('ZZZZZZ', first.host.sessionToken))).toBe('ROOM_NOT_FOUND')
  })

  it('passes the host role on only after the host is gone for good', () => {
    const { room, host, others } = roomOf(3)
    service.disconnect(room.code, host.id)
    vi.advanceTimersByTime(RECONNECT_GRACE_MS - 1)
    expect(room.hostId).toBe(host.id)
    vi.advanceTimersByTime(1)
    expect(room.hostId).toBe(others[0]!.id)
    expect(room.players).toHaveLength(2)
  })

  it('hands the host role to a connected player, skipping disconnected ones', () => {
    const { room, host, others } = roomOf(3)
    service.disconnect(room.code, others[0]!.id)
    service.leave(room.code, host.id)
    expect(room.hostId).toBe(others[1]!.id)
  })

  it('keeps seats while everyone is offline and deletes the room after 10 minutes', () => {
    const { room, host, others } = roomOf(3)
    for (const player of [host, ...others]) {
      service.disconnect(room.code, player.id)
    }

    vi.advanceTimersByTime(ROOM_EXPIRY_MS - 1)
    expect(room.players).toHaveLength(3)
    expect(service.getRoom(room.code)).toBeDefined()
    vi.advanceTimersByTime(1)
    expect(service.getRoom(room.code)).toBeUndefined()
  })

  it('cancels expiry when someone comes back, then drops seats that stayed away', () => {
    const { room, host, others } = roomOf(3)
    for (const player of [host, ...others]) {
      service.disconnect(room.code, player.id)
    }

    vi.advanceTimersByTime(5 * 60_000)
    service.resume(room.code, host.sessionToken)
    vi.advanceTimersByTime(ROOM_EXPIRY_MS)
    expect(service.getRoom(room.code)).toBeDefined()
    expect(room.players.map((p) => p.id)).toEqual([host.id])
  })

  it('stops the round timer when the room is deleted', () => {
    const { room, host } = roomOf(3)
    service.startRound(room.code, host.id)
    for (const player of [...room.players]) {
      service.leave(room.code, player.id)
    }
    expect(service.getRoom(room.code)).toBeUndefined()
    events.length = 0
    vi.advanceTimersByTime(60 * 60_000)
    expect(events).toEqual([])
  })

  it('ignores a second disconnect and a disconnect of an unknown seat', () => {
    const { room, others } = roomOf(3)
    service.disconnect(room.code, others[0]!.id)
    const count = events.length
    service.disconnect(room.code, others[0]!.id)
    service.disconnect(room.code, 'ghost')
    service.disconnect('ZZZZZZ', 'ghost')
    expect(events).toHaveLength(count)
  })
})
