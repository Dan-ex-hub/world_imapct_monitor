import type { ForexPair } from '@/store/types'

/** In-memory forex price cache with TTL */
const cache = new Map<string, { data: ForexPair; expiresAt: number }>()
const DEFAULT_TTL = 60_000 // 1 minute

export function getCachedForex(pair: string): ForexPair | null {
  const entry = cache.get(pair)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(pair)
    return null
  }
  return entry.data
}

export function setCachedForex(pair: string, data: ForexPair, ttl = DEFAULT_TTL): void {
  cache.set(pair, { data, expiresAt: Date.now() + ttl })
}

export function getAllCachedForex(): ForexPair[] {
  const now = Date.now()
  const result: ForexPair[] = []
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) {
      cache.delete(key)
    } else {
      result.push(entry.data)
    }
  }
  return result
}
