import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type {
  ErrorPayload,
  RoomJoinedPayload,
  RoomLeftPayload,
  RoomStatePayload,
  RoundEndedPayload,
  RoundRolePayload,
  RoundStartedPayload,
} from '@espiao/game-core'
import { TestClient, settle, startTestServer } from '../testing/test-client.ts'
import type { TestServer } from '../testing/test-client.ts'

describe('gateway integration', () => {
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

  async function createRoom(nickname = 'Host') {
    const host = await connect()
    host.emit('room:create', { nickname })
    const joined = await host.waitFor<RoomJoinedPayload>('room:joined')
    return { host, joined }
  }

  async function joinRoom(roomCode: string, nickname: string) {
    const client = await connect()
    client.emit('room:join', { roomCode, nickname })
    const joined = await client.waitFor<RoomJoinedPayload>('room:joined')
    return { client, joined }
  }

  async function errorOf(client: TestClient, action: () => void): Promise<ErrorPayload> {
    const before = client.all('error').length
    action()
    return client.waitFor<ErrorPayload>('error', () => client.all('error').length > before)
  }

  it('creates a room, then lets others join and everyone sees the same player list', async () => {
    const { host, joined } = await createRoom('Ana')
    expect(joined.roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(joined.you.nickname).toBe('Ana')

    const { client: bia } = await joinRoom(joined.roomCode, 'Bia')
    const state = await host.waitFor<RoomStatePayload>('room:state', (s) => s.players.length === 2)
    expect(state.hostId).toBe(joined.you.id)
    expect(state.phase).toBe('lobby')
    expect(bia.last<RoomStatePayload>('room:state')?.players.map((p) => p.nickname)).toEqual(['Ana', 'Bia'])
  })

  it('never exposes session tokens in broadcasts', async () => {
    const { host, joined } = await createRoom()
    const { client, joined: other } = await joinRoom(joined.roomCode, 'Bia')
    await host.waitFor<RoomStatePayload>('room:state', (s) => s.players.length === 2)
    expect(JSON.stringify(host.received)).not.toContain(other.sessionToken)
    expect(JSON.stringify(client.received)).not.toContain(joined.sessionToken)
  })

  it('reports the stable error codes', async () => {
    const { host, joined } = await createRoom('Ana')
    const stranger = await connect()

    expect((await errorOf(stranger, () => stranger.emit('room:join', { roomCode: 'ZZZZZZ', nickname: 'X' }))).code).toBe('ROOM_NOT_FOUND')
    expect((await errorOf(stranger, () => stranger.emit('room:join', { roomCode: joined.roomCode, nickname: 'ana' }))).code).toBe('NICKNAME_TAKEN')
    expect((await errorOf(stranger, () => stranger.emit('room:create', { nickname: '' }))).code).toBe('INVALID_PAYLOAD')
    expect((await errorOf(stranger, () => stranger.emit('room:create', 'not an object'))).code).toBe('INVALID_PAYLOAD')
    expect((await errorOf(stranger, () => stranger.emit('round:start'))).code).toBe('NOT_IN_ROOM')
    expect((await errorOf(host, () => host.emit('round:start'))).code).toBe('NOT_ENOUGH_PLAYERS')
    expect((await errorOf(host, () => host.emit('room:updateSettings', { settings: { spiesCount: 0, durationInMinutes: 5, spyGetsHint: true, customLocations: [] } }))).code).toBe('INVALID_SETTINGS')
    expect((await errorOf(host, () => host.emit('room:updateSettings', { settings: { spiesCount: 'x' } }))).code).toBe('INVALID_PAYLOAD')
  })

  it('fills up at 20 players', async () => {
    const { joined } = await createRoom('P0')
    for (let index = 1; index < 20; index += 1) {
      await joinRoom(joined.roomCode, `P${index}`)
    }
    const extra = await connect()
    const error = await errorOf(extra, () => extra.emit('room:join', { roomCode: joined.roomCode, nickname: 'extra' }))
    expect(error.code).toBe('ROOM_FULL')
  })

  it('applies host settings for everyone and rejects them from other players', async () => {
    const { host, joined } = await createRoom()
    const { client } = await joinRoom(joined.roomCode, 'Bia')
    const settings = { spiesCount: 1, durationInMinutes: 10, spyGetsHint: false, customLocations: [{ name: 'Casa da vovó', hint: 'Bolo' }] }

    host.emit('room:updateSettings', { settings })
    const state = await client.waitFor<RoomStatePayload>('room:state', (s) => s.settings.durationInMinutes === 10)
    expect(state.settings).toEqual(settings)
    expect((await errorOf(client, () => client.emit('room:updateSettings', { settings }))).code).toBe('NOT_HOST')
  })

  it('kicks a player, who is told and leaves the room channel', async () => {
    const { host, joined } = await createRoom()
    const { client, joined: bia } = await joinRoom(joined.roomCode, 'Bia')
    const { client: cal } = await joinRoom(joined.roomCode, 'Cal')

    expect((await errorOf(client, () => client.emit('room:kick', { playerId: joined.you.id }))).code).toBe('NOT_HOST')
    host.emit('room:kick', { playerId: bia.you.id })
    expect((await client.waitFor<RoomLeftPayload>('room:left')).reason).toBe('kicked')
    await cal.waitFor<RoomStatePayload>('room:state', (s) => s.players.length === 2)

    const before = client.received.length
    host.emit('room:updateSettings', { settings: { spiesCount: 1, durationInMinutes: 3, spyGetsHint: true, customLocations: [] } })
    await cal.waitFor<RoomStatePayload>('room:state', (s) => s.settings.durationInMinutes === 3)
    await settle()
    expect(client.received.length).toBe(before)
  })

  it('removes a player who leaves and hands the host role on', async () => {
    const { host, joined } = await createRoom()
    const { client: bia, joined: biaJoined } = await joinRoom(joined.roomCode, 'Bia')
    host.emit('room:leave')
    expect((await host.waitFor<RoomLeftPayload>('room:left')).reason).toBe('left')
    const state = await bia.waitFor<RoomStatePayload>('room:state', (s) => s.players.length === 1)
    expect(state.hostId).toBe(biaJoined.you.id)
  })

  it('shows a dropped player as disconnected and lets them resume the same seat', async () => {
    const { host, joined } = await createRoom('Ana')
    const { client: bia, joined: biaJoined } = await joinRoom(joined.roomCode, 'Bia')
    bia.close()
    const dropped = await host.waitFor<RoomStatePayload>('room:state', (s) => s.players.some((p) => !p.connected))
    expect(dropped.players.find((p) => p.id === biaJoined.you.id)?.connected).toBe(false)

    const back = await connect()
    back.emit('room:resume', { roomCode: joined.roomCode, sessionToken: biaJoined.sessionToken })
    const again = await back.waitFor<RoomJoinedPayload>('room:joined')
    expect(again.you.id).toBe(biaJoined.you.id)
    const state = await host.waitFor<RoomStatePayload>('room:state', (s) => s.players.every((p) => p.connected) && s.players.length === 2)
    expect(state.players).toHaveLength(2)
  })

  it('gives a returning player their own role and the countdown mid-round', async () => {
    const { host, joined } = await createRoom()
    const others = [await joinRoom(joined.roomCode, 'Bia'), await joinRoom(joined.roomCode, 'Cal')]
    host.emit('round:start')
    const target = others[0]!
    const original = await target.client.waitFor<RoundRolePayload>('round:role')
    const started = await target.client.waitFor<RoundStartedPayload>('round:started')

    target.client.close()
    await host.waitFor<RoomStatePayload>('room:state', (s) => s.players.some((p) => !p.connected))

    const back = await connect()
    back.emit('room:resume', { roomCode: joined.roomCode, sessionToken: target.joined.sessionToken })
    expect(await back.waitFor<RoundRolePayload>('round:role')).toEqual(original)
    const resumed = await back.waitFor<RoundStartedPayload>('round:started')
    expect(resumed.endsAt).toBe(started.endsAt)
    expect(resumed.firstAskerId).toBe(started.firstAskerId)
  })

  it('sends the result to a player who resumes after the round ended', async () => {
    const { host, joined } = await createRoom()
    const bia = await joinRoom(joined.roomCode, 'Bia')
    await joinRoom(joined.roomCode, 'Cal')
    host.emit('round:start')
    await bia.client.waitFor('round:role')
    bia.client.close()
    host.emit('round:end')
    await host.waitFor('round:ended')

    const back = await connect()
    back.emit('room:resume', { roomCode: joined.roomCode, sessionToken: bia.joined.sessionToken })
    const ended = await back.waitFor<RoundEndedPayload>('round:ended')
    expect(ended.spyIds).toHaveLength(1)
    expect(back.all('round:role')).toHaveLength(0)
  })

  it('rejects bad session tokens and expired rooms', async () => {
    const { joined } = await createRoom()
    const stranger = await connect()
    expect((await errorOf(stranger, () => stranger.emit('room:resume', { roomCode: joined.roomCode, sessionToken: 'wrong' }))).code).toBe('SESSION_INVALID')
    expect((await errorOf(stranger, () => stranger.emit('room:resume', { roomCode: 'ZZZZZZ', sessionToken: joined.sessionToken }))).code).toBe('ROOM_NOT_FOUND')
  })

  it('a second device taking over a seat replaces the first without dropping the seat', async () => {
    const { host, joined } = await createRoom()
    const { client: first, joined: biaJoined } = await joinRoom(joined.roomCode, 'Bia')

    const second = await connect()
    second.emit('room:resume', { roomCode: joined.roomCode, sessionToken: biaJoined.sessionToken })
    await second.waitFor('room:joined')
    await new Promise<void>((resolve) => (first.socket.connected ? first.socket.once('disconnect', () => resolve()) : resolve()))
    await settle()

    const state = host.last<RoomStatePayload>('room:state')!
    expect(state.players.find((p) => p.id === biaJoined.you.id)?.connected).toBe(true)
  })

  it('drops events beyond the per-socket rate limit', async () => {
    const stranger = await connect()
    for (let index = 0; index < 100; index += 1) {
      stranger.emit('round:start')
    }
    await settle(300)
    const errors = stranger.all<ErrorPayload>('error').length
    expect(errors).toBeGreaterThan(0)
    expect(errors).toBeLessThan(40)
  })

  it('disconnects clients that send oversized payloads, without affecting others', async () => {
    const { host } = await createRoom()
    const abuser = await connect()
    const closed = new Promise<void>((resolve) => abuser.socket.once('disconnect', () => resolve()))
    abuser.emit('room:create', { nickname: 'x'.repeat(200_000) })
    await closed
    expect(host.socket.connected).toBe(true)
    expect(abuser.all('room:joined')).toHaveLength(0)
  })
})
