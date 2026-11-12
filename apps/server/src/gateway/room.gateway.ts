import { Inject, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import type { OnGatewayDisconnect } from '@nestjs/websockets'
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { CLIENT_EVENTS, SERVER_EVENTS } from '@espiao/game-core'
import type { ErrorPayload, RoomJoinedPayload } from '@espiao/game-core'
import type { Server, Socket } from 'socket.io'
import type { ZodType } from 'zod'
import { RoomError } from '../rooms/room.errors.ts'
import { RoomService, toPublicPlayer, toRoomState } from '../rooms/room.service.ts'
import type { RoomEvent, Seat } from '../rooms/room.service.ts'
import { RateLimiter } from './rate-limiter.ts'
import {
  createSchema,
  joinSchema,
  kickSchema,
  updateSettingsSchema,
} from './schemas.ts'

/** Maximum events per second a single socket may send. */
export const EVENTS_PER_SECOND = 20

type SeatRef = { roomCode: string; playerId: string }

@WebSocketGateway()
export class RoomGateway implements OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoomGateway.name)
  private readonly rooms: RoomService
  private readonly limiters = new WeakMap<Socket, RateLimiter>()
  private readonly sockets = new Map<string, Socket>()
  private unsubscribe: (() => void) | undefined

  @WebSocketServer()
  private server!: Server

  constructor(@Inject(RoomService) rooms: RoomService) {
    this.rooms = rooms
  }

  onModuleInit(): void {
    this.unsubscribe = this.rooms.onEvent((event) => this.handleRoomEvent(event))
  }

  onModuleDestroy(): void {
    this.unsubscribe?.()
  }

  handleDisconnect(client: Socket): void {
    const seat = this.seatOf(client)

    if (!seat) {
      return
    }

    // Step 3 behavior: a dropped socket leaves the room. Reconnection grace comes later.
    this.sockets.delete(this.key(seat))
    this.rooms.leave(seat.roomCode, seat.playerId)
  }

  @SubscribeMessage(CLIENT_EVENTS.create)
  create(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.guard(client, createSchema, body, (data) => {
      this.requireNoSeat(client)
      this.enter(client, this.rooms.createRoom(data.nickname))
    })
  }

  @SubscribeMessage(CLIENT_EVENTS.join)
  join(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.guard(client, joinSchema, body, (data) => {
      this.requireNoSeat(client)
      this.enter(client, this.rooms.joinRoom(data.roomCode, data.nickname))
    })
  }

  @SubscribeMessage(CLIENT_EVENTS.updateSettings)
  updateSettings(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.guard(client, updateSettingsSchema, body, (data) => {
      const seat = this.requireSeatRef(client)
      this.rooms.updateSettings(seat.roomCode, seat.playerId, data.settings)
    })
  }

  @SubscribeMessage(CLIENT_EVENTS.kick)
  kick(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.guard(client, kickSchema, body, (data) => {
      const seat = this.requireSeatRef(client)
      this.rooms.kick(seat.roomCode, seat.playerId, data.playerId)
    })
  }

  @SubscribeMessage(CLIENT_EVENTS.startRound)
  startRound(@ConnectedSocket() client: Socket): void {
    this.guard(client, null, undefined, () => {
      const seat = this.requireSeatRef(client)
      this.rooms.startRound(seat.roomCode, seat.playerId)
    })
  }

  @SubscribeMessage(CLIENT_EVENTS.endRound)
  endRound(@ConnectedSocket() client: Socket): void {
    this.guard(client, null, undefined, () => {
      const seat = this.requireSeatRef(client)
      this.rooms.endRound(seat.roomCode, seat.playerId)
    })
  }

  @SubscribeMessage(CLIENT_EVENTS.backToLobby)
  backToLobby(@ConnectedSocket() client: Socket): void {
    this.guard(client, null, undefined, () => {
      const seat = this.requireSeatRef(client)
      this.rooms.backToLobby(seat.roomCode, seat.playerId)
    })
  }

  @SubscribeMessage(CLIENT_EVENTS.leave)
  leave(@ConnectedSocket() client: Socket): void {
    this.guard(client, null, undefined, () => {
      const seat = this.requireSeatRef(client)
      this.detach(client, seat)
      this.rooms.leave(seat.roomCode, seat.playerId)
      client.emit(SERVER_EVENTS.left, { reason: 'left' })
    })
  }

  // --- helpers -------------------------------------------------------------

  private enter(client: Socket, seat: Seat): void {
    const ref: SeatRef = { roomCode: seat.room.code, playerId: seat.player.id }
    client.data.seat = ref
    this.sockets.set(this.key(ref), client)
    void client.join(ref.roomCode)

    const joined: RoomJoinedPayload = {
      roomCode: ref.roomCode,
      sessionToken: seat.player.sessionToken,
      you: toPublicPlayer(seat.player),
    }
    client.emit(SERVER_EVENTS.joined, joined)
    client.emit(SERVER_EVENTS.state, toRoomState(seat.room))
  }

  private detach(client: Socket, seat: SeatRef): void {
    this.sockets.delete(this.key(seat))
    void client.leave(seat.roomCode)
    client.data.seat = undefined
  }

  private handleRoomEvent(event: RoomEvent): void {
    if (event.type === 'state') {
      const room = this.rooms.getRoom(event.roomCode)
      if (room) {
        this.server.to(event.roomCode).emit(SERVER_EVENTS.state, toRoomState(room))
      }
      return
    }

    if (event.type === 'roundStarted') {
      this.sendRoundStart(event.roomCode)
      return
    }

    if (event.type === 'roundEnded') {
      const result = this.rooms.getRoom(event.roomCode)
      const payload = result && this.rooms.resultOf(result)
      if (payload) {
        this.server.to(event.roomCode).emit(SERVER_EVENTS.roundEnded, payload)
      }
      return
    }

    const socket = this.sockets.get(this.key(event))
    if (socket) {
      this.detach(socket, event)
      socket.emit(SERVER_EVENTS.left, { reason: event.reason })
    }
  }

  /**
   * Each role goes to its owner's socket only, never to the room channel.
   * `round:started` carries nothing secret and is broadcast.
   */
  private sendRoundStart(roomCode: string): void {
    const room = this.rooms.getRoom(roomCode)

    if (!room?.round) {
      return
    }

    for (const player of room.players) {
      const role = this.rooms.roleFor(room, player.id)
      const socket = this.sockets.get(this.key({ roomCode, playerId: player.id }))
      if (role && socket) {
        socket.emit(SERVER_EVENTS.roundRole, role)
      }
    }

    this.server.to(roomCode).emit(SERVER_EVENTS.roundStarted, {
      firstAskerId: room.round.firstAskerId,
      endsAt: room.round.endsAt,
    })
  }

  private seatOf(client: Socket): SeatRef | undefined {
    return client.data.seat as SeatRef | undefined
  }

  private requireSeatRef(client: Socket): SeatRef {
    const seat = this.seatOf(client)

    if (!seat) {
      throw new RoomError('NOT_IN_ROOM', 'Você não está em uma sala.')
    }

    return seat
  }

  private requireNoSeat(client: Socket): void {
    if (this.seatOf(client)) {
      throw new RoomError('INVALID_PAYLOAD', 'Você já está em uma sala.')
    }
  }

  private key(seat: SeatRef): string {
    return `${seat.roomCode}:${seat.playerId}`
  }

  /** Rate limit, validate, run, and turn failures into `error` events. */
  private guard<T>(
    client: Socket,
    schema: ZodType<T> | null,
    body: unknown,
    run: (data: T) => void,
  ): void {
    let limiter = this.limiters.get(client)
    if (!limiter) {
      limiter = new RateLimiter(EVENTS_PER_SECOND)
      this.limiters.set(client, limiter)
    }

    if (!limiter.allow()) {
      return
    }

    let data: T
    if (schema) {
      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        this.sendError(client, { code: 'INVALID_PAYLOAD', message: 'Dados inválidos.' })
        return
      }
      data = parsed.data
    } else {
      data = undefined as T
    }

    try {
      run(data)
    } catch (error) {
      if (error instanceof RoomError) {
        this.sendError(client, { code: error.code, message: error.message })
        return
      }
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error))
      this.sendError(client, { code: 'INVALID_PAYLOAD', message: 'Algo deu errado. Tente de novo.' })
    }
  }

  private sendError(client: Socket, payload: ErrorPayload): void {
    client.emit(SERVER_EVENTS.error, payload)
  }
}
