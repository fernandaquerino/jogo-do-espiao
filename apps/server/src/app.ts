import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { IoAdapter } from '@nestjs/platform-socket.io'
import type { INestApplication } from '@nestjs/common'
import type { ServerOptions } from 'socket.io'
import { AppModule } from './app.module.ts'
import type { ServerConfig } from './config.ts'

/** Largest message a client may send; bigger ones are dropped by Socket.IO. */
export const MAX_MESSAGE_BYTES = 32 * 1024

class ConfiguredIoAdapter extends IoAdapter {
  private readonly corsOrigins: string[]

  constructor(app: INestApplication, config: ServerConfig) {
    super(app)
    this.corsOrigins = config.corsOrigins
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigins },
      maxHttpBufferSize: MAX_MESSAGE_BYTES,
    })
  }
}

export async function createApp(config: ServerConfig): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] })
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app, config))
  app.enableShutdownHooks()
  return app
}
