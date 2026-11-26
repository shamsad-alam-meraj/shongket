import { overpass } from "@/lib/live/overpass"
import { cached, parseCoords } from "@/lib/live/cache"
import { clientIp, rateLimit } from "@/lib/live/rate-limit"
import { haversineKm, type LiveService, type ServiceKind, type ServicesResponse } from "@/lib/live/types"

const query = (lat: number, lng: number) =>
  `[out:json][timeout:20];nwr[amenity~"^(hospital|clinic|pharmacy|police|fire_station)$"](around:3000,${lat},${lng});out center 150;`

export async function GET(request: Request) {
  const rl = rateLimit(`services:${clientIp(request)}`, 60, 60_000)
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } })
  const c = parseCoords(new URL(request.url), 3)
  if (!c) return Response.json({ error: "lat and lng are required" }, { status: 400 })
  try {
    const osm = await cached(`osm:${c.lat},${c.lng}`, 30 * 60_000, () => overpass(query(c.lat, c.lng), 20000))
    const services: LiveService[] = osm.elements
      .flatMap((e): LiveService[] => {
        const lat = e.lat ?? e.center?.lat
        const lng = e.lon ?? e.center?.lon
        const t = e.tags ?? {}
        if (lat == null || lng == null) return []
        const kind = t.amenity as ServiceKind
        return [{
          id: `${e.type}/${e.id}`,
          name: t.name || t["name:en"] || "Unnamed " + kind.replace("_", " "),
          nameBn: t["name:bn"],
          kind,
          lat,
          lng,
          distanceKm: haversineKm(c.exact, { lat, lng }),
          openingHours: t.opening_hours,
          emergency: t.emergency === "yes",
        }]
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
    const body: ServicesResponse = { services, source: "OpenStreetMap contributors (Overpass API)", ok: true, generatedAt: new Date().toISOString() }
    return Response.json(body)
  } catch (e) {
    const body: ServicesResponse = { services: [], source: `OpenStreetMap (unavailable: ${String(e)})`, ok: false, generatedAt: new Date().toISOString() }
    return Response.json(body, { status: 200 })
  }
}
