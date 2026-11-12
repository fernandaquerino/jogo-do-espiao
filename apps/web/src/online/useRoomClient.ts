import { createContext, useContext, useSyncExternalStore } from 'react'
import type { ClientState, RoomClient } from './RoomClient'

export const RoomClientContext = createContext<RoomClient | null>(null)

export function useRoomClient(): RoomClient {
  const client = useContext(RoomClientContext)

  if (!client) {
    throw new Error('useRoomClient must be used inside RoomClientProvider')
  }

  return client
}

export function useRoomState(): ClientState {
  const client = useRoomClient()
  return useSyncExternalStore(client.subscribe, client.getState)
}
