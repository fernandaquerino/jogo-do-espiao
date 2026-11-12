import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  DEFAULT_SETTINGS,
  MAX_NICKNAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  createRound,
  validateSettings,
} from '@espiao/game-core'
import type {
  PublicPlayer,
  RoomStatePayload,
  RoundEndedPayload,
  RoundRolePayload,
  RoundSettings,
} from '@espiao/game-core'
import { RoomError } from './room.errors.ts'
import { generateRoomCode, generateSessionToken, normalizeRoomCode } from './room-code.ts'
import { ROOM_STORE } from './room-store.ts'
import type { RoomStore } from './room-store.ts'
import type { PlayerRecord, Room } from './room.types.ts'

/** Notifications the transport layer turns into socket messages. */
export type RoomEvent =
  | { type: 'state'; roomCode: string }
  | { type: 'roundStarted'; roomCode: string }
  | { type: 'roundEnded'; roomCode: string }
  | { type: 'removed'; roomCode: string; playerId: string; reason: 'kicked' | 'left' }

export type RoomEventListener = (event: RoomEvent) => void

export type Seat = { room: Room; player: PlayerRecord }

export function toPublicPlayer(player: PlayerRecord): PublicPlayer {
  return { id: player.id, nickname: player.nickname, connected: player.connected }
}

export function toRoomState(room: Room): RoomStatePayload {
  return {
    players: room.players.map(toPublicPlayer),
    hostId: room.hostId,
    settings: room.settings,
    phase: room.phase,
  }
}

function cleanNickname(input: string): string {
  const nickname = input.replace(/\s+/g, ' ').trim()

  if (nickname.length < 1 || nickname.length > MAX_NICKNAME_LENGTH) {
    throw new RoomError(
      'INVALID_PAYLOAD',
      `O apelido precisa ter entre 1 e ${MAX_NICKNAME_LENGTH} caracteres.`,
    )
  }

  return nickname
}

@Injectable()
export class RoomService {
  private readonly store: RoomStore
  private readonly listeners = new Set<RoomEventListener>()
  private readonly timers = new Map<string, NodeJS.Timeout>()

  constructor(@Inject(ROOM_STORE) store: RoomStore) {
    this.store = store
  }

  onEvent(listener: RoomEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: RoomEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  createRoom(nicknameInput: string): Seat {
    const nickname = cleanNickname(nicknameInput)
    const player = this.newPlayer(nickname)
    const room: Room = {
      code: this.freshRoomCode(),
      hostId: player.id,
      players: [player],
      settings: { ...DEFAULT_SETTINGS, customLocations: [] },
      phase: 'lobby',
      round: null,
    }

    this.store.save(room)
    return { room, player }
  }

  joinRoom(codeInput: string, nicknameInput: string): Seat {
    const room = this.requireRoom(codeInput)
    const nickname = cleanNickname(nicknameInput)

    if (room.phase === 'playing') {
      throw new RoomError('ROUND_IN_PROGRESS', 'Uma rodada está em andamento. Aguarde o fim dela.')
    }

    if (room.players.length >= MAX_PLAYERS) {
      throw new RoomError('ROOM_FULL', 'A sala está cheia.')
    }

    if (room.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
      throw new RoomError('NICKNAME_TAKEN', 'Já existe um jogador com esse apelido na sala.')
    }

    const player = this.newPlayer(nickname)
    room.players.push(player)
    this.store.save(room)
    this.emit({ type: 'state', roomCode: room.code })
    return { room, player }
  }

  getRoom(code: string): Room | undefined {
    return this.store.get(normalizeRoomCode(code))
  }

  /** Removes a player right away (explicit leave). */
  leave(roomCode: string, playerId: string): void {
    this.removePlayer(roomCode, playerId, 'left', false)
  }

  kick(roomCode: string, hostId: string, targetId: string): void {
    const room = this.requireRoom(roomCode)
    this.requireHost(room, hostId)

    if (room.phase === 'playing') {
      throw new RoomError('ROUND_IN_PROGRESS', 'Não é possível remover jogadores durante a rodada.')
    }

    if (targetId === hostId || !room.players.some((p) => p.id === targetId)) {
      throw new RoomError('INVALID_PAYLOAD', 'Jogador inválido.')
    }

    this.removePlayer(room.code, targetId, 'kicked', true)
  }

  updateSettings(roomCode: string, hostId: string, settings: RoundSettings): Room {
    const room = this.requireRoom(roomCode)
    this.requireHost(room, hostId)

    if (room.phase === 'playing') {
      throw new RoomError('ROUND_IN_PROGRESS', 'As configurações não podem mudar durante a rodada.')
    }

    // Not enough players is fine while editing; spies are checked against the larger of
    // the current room size and the minimum, and everything is re-checked at round start.
    const issue = validateSettings(settings, Math.max(room.players.length, MIN_PLAYERS))

    if (issue) {
      throw new RoomError('INVALID_SETTINGS', issue.message)
    }

    room.settings = {
      ...settings,
      customLocations: settings.customLocations.map((l) => ({
        name: l.name.trim(),
        hint: l.hint.trim(),
      })),
    }
    this.store.save(room)
    this.emit({ type: 'state', roomCode: room.code })
    return room
  }

  startRound(roomCode: string, hostId: string): Room {
    const room = this.requireRoom(roomCode)
    this.requireHost(room, hostId)

    if (room.phase === 'playing') {
      throw new RoomError('ROUND_IN_PROGRESS', 'Já existe uma rodada em andamento.')
    }

    const issue = validateSettings(room.settings, room.players.length)

    if (issue) {
      throw new RoomError(issue.code, issue.message)
    }

    const { location, spyIds, firstAskerId } = createRound(
      room.players.map((p) => p.id),
      room.settings,
    )
    const durationMs = room.settings.durationInMinutes * 60_000

    room.phase = 'playing'
    room.round = { location, spyIds, firstAskerId, endsAt: Date.now() + durationMs }
    this.store.save(room)
    this.setTimer(`round:${room.code}`, durationMs, () => this.finishRound(room.code))

    this.emit({ type: 'roundStarted', roomCode: room.code })
    this.emit({ type: 'state', roomCode: room.code })
    return room
  }

  /** Host ends the round before the timer. */
  endRound(roomCode: string, hostId: string): Room {
    const room = this.requireRoom(roomCode)
    this.requireHost(room, hostId)

    if (room.phase !== 'playing') {
      throw new RoomError('INVALID_PAYLOAD', 'Não há rodada em andamento.')
    }

    this.finishRound(room.code)
    return room
  }

  backToLobby(roomCode: string, hostId: string): Room {
    const room = this.requireRoom(roomCode)
    this.requireHost(room, hostId)

    if (room.phase === 'playing') {
      throw new RoomError('ROUND_IN_PROGRESS', 'Termine a rodada antes de voltar ao lobby.')
    }

    room.phase = 'lobby'
    room.round = null
    this.store.save(room)
    this.emit({ type: 'state', roomCode: room.code })
    return room
  }

  /** The private role card of one player; null when no round is running. */
  roleFor(room: Room, playerId: string): RoundRolePayload | null {
    if (room.phase !== 'playing' || !room.round) {
      return null
    }

    if (room.round.spyIds.includes(playerId)) {
      return room.settings.spyGetsHint
        ? { role: 'spy', hint: room.round.location.hint }
        : { role: 'spy' }
    }

    return { role: 'player', location: room.round.location.name }
  }

  /** What everyone learns when the round is over; null before that. */
  resultOf(room: Room): RoundEndedPayload | null {
    if (room.phase !== 'result' || !room.round) {
      return null
    }

    return { location: room.round.location, spyIds: room.round.spyIds }
  }

  /** Returns the room and player for a code and player id, or throws NOT_IN_ROOM. */
  requireSeat(roomCode: string, playerId: string): Seat {
    const room = this.store.get(roomCode)
    const player = room?.players.find((p) => p.id === playerId)

    if (!room || !player) {
      throw new RoomError('NOT_IN_ROOM', 'Você não está nesta sala.')
    }

    return { room, player }
  }

  protected requireRoom(codeInput: string): Room {
    const room = this.store.get(normalizeRoomCode(codeInput))

    if (!room) {
      throw new RoomError('ROOM_NOT_FOUND', 'Sala não encontrada. Confira o código.')
    }

    return room
  }

  protected requireHost(room: Room, playerId: string): void {
    if (room.hostId !== playerId) {
      throw new RoomError('NOT_HOST', 'Só quem criou a sala pode fazer isso.')
    }
  }

  protected removePlayer(
    roomCode: string,
    playerId: string,
    reason: 'kicked' | 'left',
    notifyPlayer: boolean,
  ): void {
    const room = this.store.get(roomCode)

    if (!room || !room.players.some((p) => p.id === playerId)) {
      return
    }

    room.players = room.players.filter((p) => p.id !== playerId)

    if (notifyPlayer) {
      this.emit({ type: 'removed', roomCode, playerId, reason })
    }

    if (room.players.length === 0) {
      this.clearRoomTimers(roomCode)
      this.store.delete(roomCode)
      return
    }

    if (room.hostId === playerId) {
      room.hostId = (room.players.find((p) => p.connected) ?? room.players[0])!.id
    }

    this.store.save(room)
    this.emit({ type: 'state', roomCode })
  }

  private finishRound(roomCode: string): void {
    const room = this.store.get(roomCode)
    this.clearTimer(`round:${roomCode}`)

    if (!room || room.phase !== 'playing') {
      return
    }

    room.phase = 'result'
    this.store.save(room)
    this.emit({ type: 'roundEnded', roomCode })
    this.emit({ type: 'state', roomCode })
  }

  private setTimer(key: string, delayMs: number, callback: () => void): void {
    this.clearTimer(key)
    const timer = setTimeout(() => {
      this.timers.delete(key)
      callback()
    }, delayMs)
    timer.unref()
    this.timers.set(key, timer)
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  /** Cancels every pending timer of a room (round, grace periods, expiry). */
  protected clearRoomTimers(roomCode: string): void {
    for (const key of [...this.timers.keys()]) {
      if (key.split(':')[1] === roomCode) {
        this.clearTimer(key)
      }
    }
  }

  private newPlayer(nickname: string): PlayerRecord {
    return { id: randomUUID(), nickname, sessionToken: generateSessionToken(), connected: true }
  }

  private freshRoomCode(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = generateRoomCode()
      if (!this.store.has(code)) {
        return code
      }
    }
    throw new RoomError('ROOM_FULL', 'Não foi possível criar a sala agora. Tente de novo.')
  }
}
