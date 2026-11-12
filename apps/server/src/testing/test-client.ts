import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { INestApplication } from '@nestjs/common'
import { createApp } from '../app.ts'

export type Received = { event: string; data: unknown }

export type TestServer = { app: INestApplication; url: string; close: () => Promise<void> }

export async function startTestServer(): Promise<TestServer> {
  const app = await createApp({ port: 0, corsOrigins: ['*'] }, ['error'])
  await app.listen(0, '127.0.0.1')
  const url = await app.getUrl()
  return { app, url: url.replace('[::1]', '127.0.0.1'), close: () => app.close() }
}

/** A socket.io client that records every message it receives, in order. */
export class TestClient {
  readonly socket: Socket
  readonly received: Received[] = []

  constructor(url: string) {
    this.socket = io(url, { transports: ['websocket'], forceNew: true, reconnection: false })
    this.socket.onAny((event: string, data: unknown) => this.received.push({ event, data }))
  }

  connected(): Promise<void> {
    return this.socket.connected
      ? Promise.resolve()
      : new Promise((resolve) => this.socket.once('connect', () => resolve()))
  }

  emit(event: string, data?: unknown): void {
    this.socket.emit(event, data)
  }

  /** Last received payload of an event, if any. */
  last<T>(event: string): T | undefined {
    return this.received.findLast((message) => message.event === event)?.data as T | undefined
  }

  all<T>(event: string): T[] {
    return this.received.filter((message) => message.event === event).map((message) => message.data as T)
  }

  /** Resolves with the next (or an already received, unconsumed-by-`since`) matching event. */
  waitFor<T>(event: string, predicate: (data: T) => boolean = () => true, timeoutMs = 2000): Promise<T> {
    const existing = this.received.find((m) => m.event === event && predicate(m.data as T))
    if (existing) {
      return Promise.resolve(existing.data as T)
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.socket.off(event, handler)
        reject(new Error(`Timeout waiting for "${event}"`))
      }, timeoutMs)
      const handler = (data: T) => {
        if (predicate(data)) {
          clearTimeout(timer)
          this.socket.off(event, handler)
          resolve(data)
        }
      }
      this.socket.on(event, handler)
    })
  }

  close(): void {
    this.socket.close()
  }
}

/** Gives pending socket messages time to arrive; use only to assert that nothing arrived. */
export function settle(ms = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
