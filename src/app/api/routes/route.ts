import { clientIp, rateLimit } from "@/lib/live/rate-limit"
import { planRoutes } from "@/lib/routes/engine"
import type { Pt, RoutesResponse } from "@/lib/routes/types"

/** Bangladesh, with a little margin */
const inBD = (p: Pt) => p.lat > 20 && p.lat < 27 && p.lng > 87.5 && p.lng < 93

function pt(v: string | null): Pt | null {
  if (!v) return null
  const [lat, lng] = v.split(",").map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

export async function GET(request: Request) {
  const rl = rateLimit(`routes:${clientIp(request)}`, 30, 60_000)
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } })
  const url = new URL(request.url)
  const from = pt(url.searchParams.get("from"))
  const to = pt(url.searchParams.get("to"))
  if (!from || !to) return Response.json({ error: "from and to are required as lat,lng" }, { status: 400 })
  if (!inBD(from) || !inBD(to)) return Response.json({ error: "Routes are available within Bangladesh" }, { status: 400 })
  const result = await planRoutes(from, to)
  const body: RoutesResponse = { from, to, ...result }
  return Response.json(body, { headers: { "Cache-Control": "no-store" } })
}
