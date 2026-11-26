import { parseCoords } from "@/lib/live/cache"
import { clientIp, rateLimit } from "@/lib/live/rate-limit"
import { mobilityPulse } from "@/lib/routes/engine"
import { DHAKA } from "@/lib/live/types"
import type { PulseResponse } from "@/lib/routes/types"

export async function GET(request: Request) {
  const rl = rateLimit(`pulse:${clientIp(request)}`, 60, 60_000)
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } })
  const c = parseCoords(new URL(request.url), 2)
  try {
    const hotspots = await mobilityPulse(c?.exact ?? DHAKA)
    const body: PulseResponse = { generatedAt: new Date().toISOString(), ok: true, hotspots }
    return Response.json(body, { headers: { "Cache-Control": "no-store" } })
  } catch {
    const body: PulseResponse = { generatedAt: new Date().toISOString(), ok: false, hotspots: [] }
    return Response.json(body, { headers: { "Cache-Control": "no-store" } })
  }
}
