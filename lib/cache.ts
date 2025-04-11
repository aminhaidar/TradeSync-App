import NodeCache from 'node-cache'

const cache = new NodeCache()

export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = cache.get<T>(key)
  if (cached) {
    return cached
  }

  const fresh = await fetchFn()
  cache.set(key, fresh, ttl)
  return fresh
}

export function invalidateCache(key: string): void {
  cache.del(key)
}

export function clearCache(): void {
  cache.flushAll()
} 