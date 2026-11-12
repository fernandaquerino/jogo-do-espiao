import type { Random } from './types.ts'

/** Fisher-Yates shuffle that returns a new array. */
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index] as T
    shuffled[index] = shuffled[randomIndex] as T
    shuffled[randomIndex] = current
  }

  return shuffled
}
