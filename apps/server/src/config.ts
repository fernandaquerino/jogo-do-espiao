export type ServerConfig = {
  port: number
  corsOrigins: string[]
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 3000)

  return {
    port: Number.isInteger(port) && port >= 0 ? port : 3000,
    corsOrigins: (env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  }
}
