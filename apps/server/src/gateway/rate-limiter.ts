/** Token bucket: `ratePerSecond` events per second with the same burst size. */
export class RateLimiter {
  private tokens: number
  private lastRefill: number
  private readonly ratePerSecond: number

  constructor(ratePerSecond: number) {
    this.ratePerSecond = ratePerSecond
    this.tokens = ratePerSecond
    this.lastRefill = Date.now()
  }

  allow(): boolean {
    const now = Date.now()
    const elapsedSeconds = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.ratePerSecond, this.tokens + elapsedSeconds * this.ratePerSecond)
    this.lastRefill = now

    if (this.tokens < 1) {
      return false
    }

    this.tokens -= 1
    return true
  }
}
