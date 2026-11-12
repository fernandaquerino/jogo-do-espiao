/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the game server, e.g. https://spy-game-server.onrender.com */
  readonly VITE_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
