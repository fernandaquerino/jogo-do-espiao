import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type {
  RoomJoinedPayload,
  RoomStatePayload,
  RoundEndedPayload,
  RoundRolePayload,
  RoundStartedPayload,
} from '@espiao/game-core'
import { TestClient, settle, startTestServer } from '../testing/test-client.ts'
import type { TestServer } from '../testing/test-client.ts'

describe('rounds over the gateway', () => {
  let server: TestServer
  let clients: TestClient[]

  beforeEach(async () => {
    server = await startTestServer()
    clients = []
  })

  afterEach(async () => {
    clients.forEach((client) => client.close())
    await server.close()
  })

  async function connect(): Promise<TestClient> {
    const client = new TestClient(server.url)
    clients.push(client)
    await client.connected()
    return client
  }

  /** Host + (count - 1) players in one room. */
  async function roomOf(count: number) {
    const host = await connect()
    host.emit('room:create', { nickname: 'Host' })
    const { roomCode } = await host.waitFor<RoomJoinedPayload>('room:joined')
    const players = [host]

    for (let index = 1; index < count; index += 1) {
      const player = await connect()
      player.emit('room:join', { roomCode, nickname: `P${index}` })
      await player.waitFor('room:joined')
      players.push(player)
    }

    await host.waitFor<RoomStatePayload>('room:state', (state) => state.players.length === count)
    return { host, players, roomCode }
  }

  it('gives every player exactly one role and only the owner sees it', async () => {
    const { host, players } = await roomOf(4)
    host.emit('room:updateSettings', {
      settings: { spiesCount: 1, durationInMinutes: 5, spyGetsHint: true, customLocations: [] },
    })
    host.emit('round:start')
    await Promise.all(players.map((player) => player.waitFor('round:role')))
    await settle()

    const roles = players.map((player) => player.all<RoundRolePayload>('round:role'))
    expect(roles.every((list) => list.length === 1)).toBe(true)

    const spies = roles.flat().filter((role) => role.role === 'spy')
    const regulars = roles.flat().filter((role) => role.role === 'player')
    expect(spies).toHaveLength(1)
    expect(regulars).toHaveLength(3)
    expect(spies[0]).not.toHaveProperty('location')
    expect(spies[0]).toHaveProperty('hint')
    expect(new Set(regulars.map((role) => role.location)).size).toBe(1)
  })

  it('never leaks the location or the spies before round:ended', async () => {
    const { host, players } = await roomOf(4)
    host.emit('round:start')
    await Promise.all(players.map((player) => player.waitFor('round:role')))
    await settle()

    const regularRole = players
      .map((player) => player.last<RoundRolePayload>('round:role')!)
      .find((role) => role.role === 'player')!
    const locationName = regularRole.location!

    for (const player of players) {
      const own = player.last<RoundRolePayload>('round:role')!
      const everythingElse = player.received.filter((message) => message.event !== 'round:role')
      const serialized = JSON.stringify(everythingElse)

      expect(player.all('round:ended')).toHaveLength(0)
      expect(serialized).not.toContain('spyIds')
      expect(serialized).not.toContain('"role"')
      if (own.role === 'spy') {
        // A spy must not receive the location name anywhere, role card included.
        expect(JSON.stringify(player.received)).not.toContain(`"${locationName}"`)
      }
    }

    host.emit('round:end')
    const ended = await players[1]!.waitFor<RoundEndedPayload>('round:ended')
    expect(ended.location.name).toBe(locationName)
    expect(ended.spyIds).toHaveLength(1)
    for (const player of players) {
      await player.waitFor('round:ended')
    }
  })

  it('broadcasts round:started with the first asker and a future endsAt', async () => {
    const { host, players } = await roomOf(3)
    const before = Date.now()
    host.emit('round:start')
    const started = await players[2]!.waitFor<RoundStartedPayload>('round:started')
    expect(started.endsAt).toBeGreaterThanOrEqual(before + 5 * 60_000 - 50)
    const state = players[2]!.last<RoomStatePayload>('room:state')!
    expect(state.phase).toBe('playing')
    expect(state.players.some((player) => player.id === started.firstAskerId)).toBe(true)
  })

  it('refuses to start for non-hosts and with too few players', async () => {
    const { players } = await roomOf(3)
    players[1]!.emit('round:start')
    expect((await players[1]!.waitFor<{ code: string }>('error')).code).toBe('NOT_HOST')

    const small = await roomOf(2)
    small.host.emit('round:start')
    expect((await small.host.waitFor<{ code: string }>('error')).code).toBe('NOT_ENOUGH_PLAYERS')
  })
})
