import { cached } from "@/lib/live/cache"
import { clientIp, rateLimit } from "@/lib/live/rate-limit"
import { geocode } from "@/lib/routes/engine"

export async function GET(request: Request) {
  const rl = rateLimit(`geocode:${clientIp(request)}`, 60, 60_000)
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } })
  const url = new URL(request.url)
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80)
  if (q.length < 2) return Response.json({ results: [] })
  const lat = Number(url.searchParams.get("lat"))
  const lng = Number(url.searchParams.get("lng"))
  const near = Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? { lat, lng } : undefined
  try {
    const key = `photon:${q.toLowerCase()}:${near ? `${near.lat.toFixed(1)},${near.lng.toFixed(1)}` : ""}`
    const results = await cached(key, 24 * 60 * 60_000, () => geocode(q, near))
    return Response.json({ results })
  } catch {
    return Response.json({ results: [], error: "Place search is busy right now" })
  }
}
