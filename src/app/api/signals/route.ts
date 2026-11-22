import { runFeeds, reverseGeocode, trafficSignals, tomtomEnabled } from "@/lib/live/feeds"
import { fetchNewsIncidents, newsSignals } from "@/lib/live/news"
import { reportSignals } from "@/lib/live/reports-store"
import { cached, parseCoords } from "@/lib/live/cache"
import { clientIp, rateLimit } from "@/lib/live/rate-limit"
import { haversineKm, type LiveResponse, type LiveSignal } from "@/lib/live/types"

const RANK = { critical: 0, significant: 1, minor: 2, normal: 3, unknown: 4 } as const

export async function GET(request: Request) {
  const rl = rateLimit(`signals:${clientIp(request)}`, 120, 60_000)
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } })
  const c = parseCoords(new URL(request.url))
  if (!c) return Response.json({ error: "lat and lng are required" }, { status: 400 })
  const p = { lat: c.lat, lng: c.lng }
  const key = `${p.lat},${p.lng}`

  // Open-data feeds: cached 5 min per ~1 km cell. Community reports: always fresh.
  const [{ signals, sources }, place, reports, news, traffic] = await Promise.all([
    cached(`feeds:${key}`, 5 * 60_000, () => runFeeds(p)),
    cached(`geo:${key}`, 60 * 60_000, () => reverseGeocode(p).catch(() => ({ place: `${p.lat}, ${p.lng}`, placeBn: undefined, country: undefined }))),
    reportSignals(c.exact),
    // News is location-independent → one global cache, filtered per user below
    cached("news", 10 * 60_000, fetchNewsIncidents).then(
      (n) => ({ ok: true as const, signals: newsSignals(n, c.exact) }),
      (e) => ({ ok: false as const, signals: [], error: String(e?.message ?? e) }),
    ),
    tomtomEnabled()
      ? cached(`traffic:${key}`, 2 * 60_000, () => trafficSignals(p)).then(
          (t) => ({ ok: true as const, signals: t }),
          (e) => ({ ok: false as const, signals: [], error: String(e?.message ?? e) }),
        )
      : Promise.resolve(null),
  ])

  // Distances relative to the user's exact position (computed here, never sent upstream)
  const all: LiveSignal[] = [...reports, ...(traffic?.signals ?? []), ...news.signals, ...signals].map((s) => ({
    ...s,
    distanceKm: s.distanceKm === 0 ? 0 : haversineKm(c.exact, s),
  }))
  // Current before expired; then local (≤ 50 km) before distant; then severity; then distance
  const stale = (s: LiveSignal) => (s.verification === "expired" ? 1 : 0)
  const far = (s: LiveSignal) => (s.distanceKm > 50 ? 1 : 0)
  all.sort((a, b) => stale(a) - stale(b) || far(a) - far(b) || RANK[a.status] - RANK[b.status] || a.distanceKm - b.distanceKm)

  const body: LiveResponse = {
    location: { ...c.exact, ...place },
    generatedAt: new Date().toISOString(),
    signals: all,
    sources: [
      { name: "Community reports", ok: true, count: reports.length },
      { name: "News reports (Google News)", ok: news.ok, count: news.signals.length, error: news.ok ? undefined : news.error },
      traffic
        ? { name: "TomTom live traffic", ok: traffic.ok, count: traffic.signals.length, error: traffic.ok ? undefined : traffic.error }
        : { name: "TomTom live traffic", ok: false, count: 0, error: "not configured (set TOMTOM_API_KEY)" },
      ...sources,
    ],
  }
  return Response.json(body, { headers: { "Cache-Control": "no-store" } })
}
