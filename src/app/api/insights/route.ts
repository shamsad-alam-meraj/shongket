import { reverseGeocode } from "@/lib/live/feeds"
import { cached, parseCoords } from "@/lib/live/cache"
import { clientIp, rateLimit } from "@/lib/live/rate-limit"
import { analyze, rulesBriefing } from "@/lib/insights/analyze"
import { aiBriefing, aiEnabled } from "@/lib/insights/briefing"
import type { Briefing, InsightsResponse } from "@/lib/insights/types"

export async function GET(request: Request) {
  const rl = rateLimit(`insights:${clientIp(request)}`, 60, 60_000)
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } })
  const c = parseCoords(new URL(request.url))
  if (!c) return Response.json({ error: "lat and lng are required" }, { status: 400 })
  const p = { lat: c.lat, lng: c.lng }
  const key = `${p.lat},${p.lng}`

  const [result, place] = await Promise.all([
    cached(`insights:${key}`, 10 * 60_000, () => analyze(p, c.exact)),
    cached(`geo:${key}`, 60 * 60_000, () =>
      reverseGeocode(p).catch(() => ({ place: `${p.lat}, ${p.lng}`, placeBn: undefined, country: undefined })),
    ),
  ])
  const shortPlace = place.place.split(",")[0]

  let briefing: Briefing = rulesBriefing(result.risks, result.impacts, shortPlace)
  let aiSource: InsightsResponse["sources"][number] = { name: "Claude briefing", ok: false, error: "Not enabled — using the rule-based briefing" }
  if (aiEnabled()) {
    try {
      // One AI briefing per ~1 km cell per 30 min keeps cost and latency low.
      briefing = await cached(`insights-ai:${key}`, 30 * 60_000, () => aiBriefing({ place: shortPlace, ...result }))
      aiSource = { name: "Claude briefing", ok: true }
    } catch (e) {
      console.warn("[insights] AI briefing failed, using rule-based briefing:", e)
      aiSource = { name: "Claude briefing", ok: false, error: "Unavailable — using the rule-based briefing" }
    }
  }

  const body: InsightsResponse = {
    location: { ...c.exact, place: place.place, placeBn: place.placeBn },
    generatedAt: new Date().toISOString(),
    overall: result.overall,
    risks: result.risks,
    trends: result.trends,
    pulse: result.pulse,
    impacts: result.impacts,
    briefing,
    sources: [aiSource, ...result.sources],
  }
  return Response.json(body, { headers: { "Cache-Control": "no-store" } })
}
