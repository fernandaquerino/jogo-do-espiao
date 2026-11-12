import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { RoomClient, browserSessionStore } from './RoomClient'
import { RoomClientContext } from './useRoomClient'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000'

export function RoomClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new RoomClient(SERVER_URL, browserSessionStore), [])
  return <RoomClientContext.Provider value={client}>{children}</RoomClientContext.Provider>
}
