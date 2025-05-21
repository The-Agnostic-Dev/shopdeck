// Deterministic random numbers so every developer gets the same demo data.

export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** mulberry32 */
  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  weighted<T extends { weight: number }>(items: readonly T[]): T {
    const total = items.reduce((s, i) => s + i.weight, 0)
    let r = this.next() * total
    for (const item of items) {
      r -= item.weight
      if (r <= 0) return item
    }
    return items[items.length - 1]
  }

  sample<T>(items: readonly T[], n: number): T[] {
    const copy = [...items]
    const out: T[] = []
    while (out.length < n && copy.length) out.push(copy.splice(Math.floor(this.next() * copy.length), 1)[0])
    return out
  }

  alnum(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''
    for (let i = 0; i < length; i++) s += chars[Math.floor(this.next() * chars.length)]
    return s
  }
}
