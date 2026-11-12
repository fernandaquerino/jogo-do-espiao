import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { CLIENT_EVENTS, SERVER_EVENTS } from '@espiao/game-core'
import type {
  ErrorPayload,
  PublicPlayer,
  RoomJoinedPayload,
  RoomLeftPayload,
  RoomStatePayload,
  RoundEndedPayload,
  RoundRolePayload,
  RoundSettings,
  RoundStartedPayload,
} from '@espiao/game-core'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export type StoredSession = { roomCode: string; sessionToken: string }

export type SessionStore = {
  load: () => StoredSession | null
  save: (session: StoredSession) => void
  clear: () => void
}

export type ClientState = {
  connection: ConnectionStatus
  /** A create, join or resume request is waiting for the server. */
  pending: boolean
  roomCode: string | null
  you: PublicPlayer | null
  room: RoomStatePayload | null
  role: RoundRolePayload | null
  round: RoundStartedPayload | null
  /** Server clock minus device clock, in ms, measured when the round started. */
  clockOffsetMs: number
  result: RoundEndedPayload | null
  error: ErrorPayload | null
  /** Why the person is no longer in a room, until they dismiss the message. */
  left: 'kicked' | 'left' | 'expired' | null
}

const INITIAL_STATE: ClientState = {
  connection: 'connecting',
  pending: false,
  roomCode: null,
  you: null,
  room: null,
  role: null,
  round: null,
  clockOffsetMs: 0,
  result: null,
  error: null,
  left: null,
}

/**
 * Talks to the game server and keeps what the UI needs in one immutable state object.
 * Created once per page load; screens read it through `useRoomState`.
 */
export class RoomClient {
  private socket: Socket | null = null
  private state: ClientState = INITIAL_STATE
  private readonly listeners = new Set<() => void>()
  private readonly url: string
  private readonly sessions: SessionStore
  private hasConnectedBefore = false
  private resumeCode: string | null = null

  constructor(url: string, sessions: SessionStore) {
    this.url = url
    this.sessions = sessions
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState = (): ClientState => this.state

  // --- connection ----------------------------------------------------------

  /** Opens the connection if it is not open yet. Safe to call many times. */
  connect(): void {
    if (this.socket) {
      if (!this.socket.connected && !this.socket.active) {
        this.setState({ connection: 'connecting' })
        this.socket.connect()
      }
      return
    }

    const socket = io(this.url, { transports: ['websocket', 'polling'] })
    this.socket = socket

    socket.on('connect', () => {
      this.hasConnectedBefore = true
      this.setState({ connection: 'connected' })
      const session = this.sessions.load()

      // After a drop, take the same seat back.
      if (session && (this.state.you || this.resumeCode === session.roomCode)) {
        this.setState({ pending: true })
        socket.emit(CLIENT_EVENTS.resume, session)
      }
    })

    socket.on('disconnect', (reason) => {
      const stopped = reason === 'io client disconnect' || reason === 'io server disconnect'
      this.setState({ connection: stopped ? 'disconnected' : 'reconnecting' })
    })

    socket.io.on('reconnect_attempt', () => this.setState({ connection: 'reconnecting' }))
    socket.on('connect_error', () =>
      this.setState({ connection: this.hasConnectedBefore ? 'reconnecting' : 'connecting' }),
    )

    socket.on(SERVER_EVENTS.joined, (payload: RoomJoinedPayload) => {
      this.sessions.save({ roomCode: payload.roomCode, sessionToken: payload.sessionToken })
      this.resumeCode = null
      this.setState({
        pending: false,
        roomCode: payload.roomCode,
        you: payload.you,
        error: null,
        left: null,
      })
    })

    socket.on(SERVER_EVENTS.state, (room: RoomStatePayload) => {
      const backInLobby = room.phase === 'lobby'
      this.setState({
        room,
        ...(backInLobby ? { role: null, round: null, result: null } : {}),
      })
    })

    socket.on(SERVER_EVENTS.roundRole, (role: RoundRolePayload) => this.setState({ role }))

    socket.on(SERVER_EVENTS.roundStarted, (round: RoundStartedPayload) =>
      this.setState({ round, result: null, clockOffsetMs: round.serverNow - Date.now() }),
    )

    socket.on(SERVER_EVENTS.roundEnded, (result: RoundEndedPayload) =>
      this.setState({ result, role: null }),
    )

    socket.on(SERVER_EVENTS.left, (payload: RoomLeftPayload) => {
      this.sessions.clear()
      this.resetRoom({ left: payload.reason })
    })

    socket.on(SERVER_EVENTS.error, (error: ErrorPayload) => {
      if (error.code === 'SESSION_INVALID' || error.code === 'ROOM_NOT_FOUND') {
        if (this.resumeCode || this.state.you) {
          this.sessions.clear()
          this.resetRoom({ left: 'expired', error })
          return
        }
      }
      this.setState({ pending: false, error })
    })
  }

  // --- actions -------------------------------------------------------------

  create(nickname: string): void {
    this.sessions.clear()
    this.setState({ pending: true, error: null, left: null })
    this.connect()
    this.socket?.emit(CLIENT_EVENTS.create, { nickname })
  }

  join(roomCode: string, nickname: string): void {
    this.sessions.clear()
    this.setState({ pending: true, error: null, left: null })
    this.connect()
    this.socket?.emit(CLIENT_EVENTS.join, { roomCode, nickname })
  }

  /**
   * Called when a room page opens. If this browser holds a seat in that room, take it back;
   * returns false when the person has to join first.
   */
  enterRoom(roomCode: string): boolean {
    if (this.state.roomCode === roomCode) {
      return true
    }

    const session = this.sessions.load()

    if (!session || session.roomCode !== roomCode) {
      this.connect()
      return false
    }

    this.resumeCode = roomCode
    this.setState({ pending: true, error: null, left: null })

    if (this.socket?.connected) {
      this.socket.emit(CLIENT_EVENTS.resume, session)
    } else {
      this.connect() // the 'connect' handler sends the resume
    }
    return true
  }

  updateSettings(settings: RoundSettings): void {
    this.socket?.emit(CLIENT_EVENTS.updateSettings, { settings })
  }

  kick(playerId: string): void {
    this.socket?.emit(CLIENT_EVENTS.kick, { playerId })
  }

  startRound(): void {
    this.socket?.emit(CLIENT_EVENTS.startRound)
  }

  endRound(): void {
    this.socket?.emit(CLIENT_EVENTS.endRound)
  }

  backToLobby(): void {
    this.socket?.emit(CLIENT_EVENTS.backToLobby)
  }

  leave(): void {
    this.socket?.emit(CLIENT_EVENTS.leave)
    this.sessions.clear()
    this.resetRoom({})
  }

  reconnect(): void {
    this.socket?.connect()
    this.setState({ connection: 'connecting' })
  }

  dismissMessages(): void {
    this.setState({ error: null, left: null })
  }

  // --- internals -----------------------------------------------------------

  private resetRoom(extra: Partial<ClientState>): void {
    this.resumeCode = null
    this.state = {
      ...INITIAL_STATE,
      connection: this.state.connection,
      ...extra,
    }
    this.notify()
  }

  private setState(changes: Partial<ClientState>): void {
    this.state = { ...this.state, ...changes }
    this.notify()
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

const STORAGE_KEY = 'espiao:session'

/** Keeps the seat in localStorage; works (as "no session") when storage is blocked. */
export const browserSessionStore: SessionStore = {
  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as Partial<StoredSession>) : null
      return typeof parsed?.roomCode === 'string' && typeof parsed.sessionToken === 'string'
        ? { roomCode: parsed.roomCode, sessionToken: parsed.sessionToken }
        : null
    } catch {
      return null
    }
  },
  save(session) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      // Storage blocked: the game still works, just without automatic resume.
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // See above.
    }
  },
}
