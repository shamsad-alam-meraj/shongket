/** Fixed-window in-memory rate limiter (per instance). Use a shared store (e.g. Upstash) at scale. */
const hits = new Map<string, { n: number; reset: number }>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || now > h.reset) {
    hits.set(key, { n: 1, reset: now + windowMs })
    if (hits.size > 10_000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k)
    return { ok: true, retryAfter: 0 }
  }
  h.n++
  return h.n <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((h.reset - now) / 1000) }
}

export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon"
  )
}
