import {
  MAX_CUSTOM_LOCATIONS,
  MAX_LOCATION_HINT_LENGTH,
  MAX_LOCATION_NAME_LENGTH,
  MAX_NICKNAME_LENGTH,
} from '@espiao/game-core'
import { z } from 'zod'

const nickname = z.string().max(MAX_NICKNAME_LENGTH * 4)
const roomCode = z.string().max(16)

export const createSchema = z.object({ nickname })
export const joinSchema = z.object({ roomCode, nickname })
export const resumeSchema = z.object({ roomCode, sessionToken: z.string().max(128) })
export const kickSchema = z.object({ playerId: z.string().max(64) })

const locationSchema = z.object({
  name: z.string().max(MAX_LOCATION_NAME_LENGTH),
  hint: z.string().max(MAX_LOCATION_HINT_LENGTH),
})

export const updateSettingsSchema = z.object({
  settings: z.object({
    spiesCount: z.number().int(),
    durationInMinutes: z.number().int(),
    spyGetsHint: z.boolean(),
    customLocations: z.array(locationSchema).max(MAX_CUSTOM_LOCATIONS),
  }),
})
