import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

/** Uppercase letters and digits without ambiguous characters (0/O, 1/I). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 6

export function generateRoomCode(): string {
  let code = ''
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]
  }
  return code
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase()
}

export function generateSessionToken(): string {
  return randomBytes(24).toString('base64url')
}

export function tokensMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}
