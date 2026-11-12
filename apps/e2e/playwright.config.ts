import { defineConfig } from '@playwright/test'

const SERVER_PORT = 3100
const WEB_PORT = 5273
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  webServer: [
    {
      // The server runs from its compiled output; `pnpm build` must have run before.
      command: 'node ../server/dist/main.js',
      env: { PORT: String(SERVER_PORT), CORS_ORIGIN: `http://localhost:${WEB_PORT}` },
      url: `http://localhost:${SERVER_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      command: `pnpm --filter @spy-game/web exec vite --port ${WEB_PORT} --strictPort`,
      cwd: '../..',
      env: { VITE_SERVER_URL: `http://localhost:${SERVER_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
    },
  ],
})
