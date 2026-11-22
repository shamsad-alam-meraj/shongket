/** Tiny in-memory TTL cache for server route handlers. */
const store = new Map<string, { at: number; value: unknown }>()

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T
  const value = await fn()
  store.set(key, { at: Date.now(), value })
  if (store.size > 500) store.delete(store.keys().next().value!)
  return value
}

/** Parse + clamp coordinates. Rounded so upstream providers only see an approximate position. */
export function parseCoords(url: URL, decimals = 2) {
  const lat = Number(url.searchParams.get("lat"))
  const lng = Number(url.searchParams.get("lng"))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  const f = 10 ** decimals
  return { lat: Math.round(lat * f) / f, lng: Math.round(lng * f) / f, exact: { lat, lng } }
}
